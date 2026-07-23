import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { QuoteRequest } from '../quotes/entities/quote-request.entity';
import { CommissionCategory } from '../commission-categories/entities/commission-category.entity';
import { CommissionCharge } from '../commission-charges/entities/commission-charge.entity';
import { Product } from '../products/entities/product.entity';
import { Buyer } from '../buyers/entities/buyer.entity';
import { resolveUnitPriceForQuantity } from '../products/pricing.util';
import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from '../common/enums/order-status.enum';
import { DeliveryType } from '../common/enums/delivery-type.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { CommissionChargeStatus } from '../common/enums/commission-charge-status.enum';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { ProductsService } from '../products/products.service';
import { UserRole } from '../common/enums/user-role.enum';

// Codigo de error de Postgres para violacion de restriccion unica (unique_violation)
const POSTGRES_UNIQUE_VIOLATION = '23505';

// IVA de El Salvador: 13%, incluido en el precio cotizado (practica estandar local).
// Se usa para separar el monto neto (base de comision) del impuesto.
const IVA_RATE = 0.13;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(QuoteRequest)
    private quoteRequestsRepository: Repository<QuoteRequest>,
    @InjectRepository(CommissionCategory)
    private commissionCategoriesRepository: Repository<CommissionCategory>,
    @InjectRepository(Buyer) private buyersRepository: Repository<Buyer>,
    private productsService: ProductsService,
  ) {}

  /**
   * Formula compartida de comision/IVA, usada tanto al aceptar una cotizacion como
   * al hacer checkout del carrito. El precio ya incluye IVA (practica de El Salvador):
   * se separa el monto neto (base real de la comision) del impuesto contenido en el precio.
   */
  private computeOrderAmounts(
    unitPrice: number,
    quantity: number,
    commissionPercentage: number,
  ) {
    const subtotal = unitPrice * quantity;
    const netAmount = Number((subtotal / (1 + IVA_RATE)).toFixed(2));
    const taxAmount = Number((subtotal - netAmount).toFixed(2));
    const commissionAmount = Number(
      ((netAmount * commissionPercentage) / 100).toFixed(2),
    );
    const payoutAmount = Number((netAmount - commissionAmount).toFixed(2));
    return { subtotal, netAmount, taxAmount, commissionAmount, payoutAmount };
  }

  /**
   * Se invoca automaticamente cuando el comprador acepta una cotizacion.
   * Calcula subtotal, comision (sobre monto neto, sin impuestos) y monto a pagar al proveedor.
   */
  async createFromAcceptedQuote(quoteRequestId: string) {
    const quoteRequest = await this.quoteRequestsRepository.findOne({
      where: { id: quoteRequestId },
      relations: ['response', 'product', 'buyer'],
    });

    if (!quoteRequest || !quoteRequest.response) {
      throw new NotFoundException(
        'No se encontro la cotizacion o su respuesta asociada',
      );
    }

    const category = await this.commissionCategoriesRepository.findOne({
      where: { id: quoteRequest.product.commissionCategoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria de comision no encontrada para el producto');
    }

    const unitPrice = Number(quoteRequest.response.unitPrice);
    const quantity = quoteRequest.requestedQuantity;
    const commissionPercentage = Number(category.commissionPercentage);

    const { subtotal, netAmount, taxAmount, commissionAmount, payoutAmount } =
      this.computeOrderAmounts(unitPrice, quantity, commissionPercentage);

    // Resuelve la direccion final de entrega segun lo elegido al solicitar la cotizacion:
    // - otra_direccion: la direccion especifica que el comprador escribio en ese momento
    // - direccion_registrada: la direccion de envio actual del perfil del comprador
    // - recoger_en_local: no aplica direccion (el comprador recoge donde esta el proveedor)
    const deliveryType = quoteRequest.deliveryType;
    const deliveryAddress =
      deliveryType === DeliveryType.OTRA_DIRECCION
        ? quoteRequest.deliveryAddress
        : deliveryType === DeliveryType.DIRECCION_REGISTRADA
          ? quoteRequest.buyer?.shippingAddress ?? null
          : null;

    const order = this.ordersRepository.create({
      quoteRequest, // ver nota en QuotesService.respond(): se asigna la relacion
      // ademas del id plano para relaciones OneToOne con columna FK explicita
      quoteRequestId: quoteRequest.id,
      buyerId: quoteRequest.buyerId,
      providerId: quoteRequest.product.providerId,
      productId: quoteRequest.productId,
      quantity,
      unitPrice,
      subtotal,
      taxAmount,
      netAmount,
      commissionPercentage,
      commissionAmount,
      payoutAmount,
      status: OrderStatus.CREADA,
      deliveryType,
      deliveryAddress,
      paymentMethod: quoteRequest.paymentMethod,
      cardLast4: quoteRequest.paymentMethod === PaymentMethod.TARJETA ? quoteRequest.cardLast4 : null,
    });

    const savedOrder = await this.ordersRepository.save(order);

    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        orderId: savedOrder.id,
        previousStatus: null,
        newStatus: OrderStatus.CREADA,
        notes: 'Orden generada automaticamente al aceptar la cotizacion',
      }),
    );

    return savedOrder;
  }

  async findAll(params: {
    buyerId?: string;
    providerId?: string;
    status?: OrderStatus;
  }) {
    return this.ordersRepository.find({
      where: {
        ...(params.buyerId ? { buyerId: params.buyerId } : {}),
        ...(params.providerId ? { providerId: params.providerId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['statusHistory', 'commissionCharge', 'claim'],
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return order;
  }

  /**
   * Control de acceso a nivel de recurso: solo el comprador o proveedor involucrados (o un admin)
   * pueden ver/gestionar la orden.
   */
  private assertParticipant(
    order: Order,
    requester: { role: string; buyerId?: string; providerId?: string },
  ) {
    if (requester.role === UserRole.ADMIN) return;
    if (requester.role === UserRole.COMPRADOR && order.buyerId === requester.buyerId)
      return;
    if (requester.role === UserRole.PROVEEDOR && order.providerId === requester.providerId)
      return;

    throw new ForbiddenException('No tienes acceso a esta orden');
  }

  async findOneForRequester(
    id: string,
    requester: { role: string; buyerId?: string; providerId?: string },
  ) {
    const order = await this.findOne(id);
    this.assertParticipant(order, requester);
    return order;
  }

  /**
   * Cambia el estado de la orden validando que la transicion sea valida y
   * ejecutando efectos de negocio (confirmar stock, liberar stock, generar el
   * cobro de comision cuando corresponde). Solo el proveedor (dueño de la orden)
   * o un admin pueden cambiar el estado operativo; el comprador puede cancelar
   * mientras la orden siga en estado "creada".
   *
   * FIX (mismo bug de fondo que en QuotesService.respond()): antes, la lectura +
   * validacion + creacion del CommissionCharge + guardado del nuevo status no tenian
   * ningun lock. Un doble click en "Marcar recibida" (o dos peticiones casi
   * simultaneas) podia leer la orden dos veces en estado "despachada" antes de que
   * cualquiera alcanzara a guardar el cambio, y ambas intentaban crear un
   * CommissionCharge para la misma orden -> choque con la restriccion unica sobre
   * "orderId", propagado como error 500 crudo, y ademas el status de la orden
   * quedaba sin guardar (porque el error interrumpia el metodo antes de esa linea).
   *
   * Fix: se envuelve todo en una transaccion con lock pesimista sobre la fila de
   * Order (mismo patron que QuotesService.respond() y los metodos de stock de
   * ProductsService). Ademas, la creacion del CommissionCharge ahora es idempotente:
   * si ya existe uno para esta orden (por ejemplo, por un intento anterior que quedo
   * a medias antes de este fix), no se duplica -- simplemente se continua y se
   * guarda el status de la orden. El try/catch de abajo queda como defensa adicional
   * por si algun caso raro se escapa del lock.
   */
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    requester: { id: string; role: string; buyerId?: string; providerId?: string },
  ) {
    try {
      return await this.ordersRepository.manager.transaction(async (manager) => {
        const order = await manager
          .createQueryBuilder(Order, 'o')
          .setLock('pessimistic_write')
          .where('o.id = :id', { id })
          .getOne();

        if (!order) {
          throw new NotFoundException('Orden no encontrada');
        }

        this.assertParticipant(order, requester);

        if (
          requester.role === UserRole.COMPRADOR &&
          dto.status !== OrderStatus.CANCELADA
        ) {
          throw new ForbiddenException(
            'El comprador solo puede cancelar la orden, no cambiar otros estados',
          );
        }

        const allowedNextStates = ORDER_STATUS_TRANSITIONS[order.status];
        if (!allowedNextStates.includes(dto.status)) {
          throw new BadRequestException(
            `No se puede pasar de "${order.status}" a "${dto.status}". Transiciones validas: ${allowedNextStates.join(', ') || 'ninguna (estado final)'}`,
          );
        }

        const previousStatus = order.status;
        order.status = dto.status;

        if (dto.status === OrderStatus.CONFIRMADA) {
          // El stock reservado se descuenta definitivamente del inventario
          await this.productsService.commitStock(order.productId, order.quantity);
        }

        if (dto.status === OrderStatus.CANCELADA) {
          // Se libera el stock que estaba reservado para esta orden
          await this.productsService.releaseStock(order.productId, order.quantity);
        }

        // Pago en efectivo contra entrega: la plataforma nunca toco el dinero (el
        // proveedor lo recibio directo del comprador al entregar), asi que aqui es
        // donde se genera automaticamente el cobro de la comision que el proveedor
        // le debe a la plataforma. Con tarjeta no aplica: ese flujo sigue via
        // Settlement (la plataforma le paga al proveedor lo que le corresponde).
        if (
          dto.status === OrderStatus.RECIBIDA &&
          order.paymentMethod === PaymentMethod.EFECTIVO_CONTRA_ENTREGA
        ) {
          const existingCharge = await manager.findOne(CommissionCharge, {
            where: { orderId: order.id },
          });
          if (!existingCharge) {
            await manager.save(
              manager.create(CommissionCharge, {
                orderId: order.id,
                providerId: order.providerId,
                amount: order.commissionAmount,
                status: CommissionChargeStatus.PENDIENTE,
              }),
            );
          }
        }

        const savedOrder = await manager.save(order);

        await manager.save(
          manager.create(OrderStatusHistory, {
            orderId: order.id,
            previousStatus,
            newStatus: dto.status,
            changedByUserId: requester.id,
            notes: dto.notes,
          }),
        );

        return savedOrder;
      });
    } catch (err) {
      if (err?.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Esta orden ya fue actualizada por otra peticion (probablemente un doble clic). Refresca la pagina para ver el estado actual.',
        );
      }
      throw err;
    }
  }

  /**
   * Checkout del carrito: compra directa sin negociacion de precio (a diferencia del
   * flujo de cotizacion, donde el proveedor aprueba/ajusta el precio antes de que
   * exista una orden). Puede incluir productos de varios proveedores -- se genera UNA
   * orden normal por producto (mismo modelo que las ordenes nacidas de una cotizacion),
   * asi que Liquidaciones, Comisiones y el resto del sistema no necesitan distinguir
   * de donde vino la orden.
   *
   * Todo el checkout es atomico: se abre UNA sola transaccion con lock pesimista sobre
   * cada producto involucrado (bloqueados en orden por id para evitar deadlocks si dos
   * compradores hacen checkout de carritos que se solapan en productos al mismo tiempo).
   * Si el stock de cualquier producto no alcanza, se revierte todo el carrito -- no se
   * crean ordenes parciales.
   */
  async checkoutCart(buyerId: string, dto: CheckoutCartDto) {
    // Combina cantidades si el carrito trae el mismo producto repetido (defensivo,
    // no deberia pasar desde el frontend, pero evita locks duplicados sobre la misma fila).
    const mergedItems = new Map<string, number>();
    for (const item of dto.items) {
      mergedItems.set(
        item.productId,
        (mergedItems.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const sortedProductIds = [...mergedItems.keys()].sort();

    const buyer = await this.buyersRepository.findOne({ where: { id: buyerId } });
    if (!buyer) {
      throw new NotFoundException('Comprador no encontrado');
    }

    const deliveryType = dto.deliveryType ?? DeliveryType.DIRECCION_REGISTRADA;
    const resolvedDeliveryAddress =
      deliveryType === DeliveryType.OTRA_DIRECCION
        ? dto.deliveryAddress ?? null
        : deliveryType === DeliveryType.DIRECCION_REGISTRADA
          ? buyer.shippingAddress ?? null
          : null;

    try {
      return await this.ordersRepository.manager.transaction(async (manager) => {
        const createdOrders: Order[] = [];

        for (const productId of sortedProductIds) {
          const quantity = mergedItems.get(productId)!;

          // Lock sin joins (mismo patron que ProductsService): FOR UPDATE no es
          // compatible con LEFT JOIN en Postgres para relaciones eager.
          const lockedProduct = await manager
            .createQueryBuilder(Product, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :id', { id: productId })
            .getOne();

          if (!lockedProduct) {
            throw new NotFoundException(`Producto ${productId} no encontrado`);
          }
          if (!lockedProduct.isActive) {
            throw new BadRequestException(
              `El producto "${lockedProduct.name}" ya no esta disponible`,
            );
          }
          if (lockedProduct.totalStock - lockedProduct.reservedStock < quantity) {
            throw new BadRequestException(
              `Stock insuficiente para "${lockedProduct.name}" (disponible: ${lockedProduct.totalStock - lockedProduct.reservedStock}, solicitado: ${quantity})`,
            );
          }

          // Se recarga con relaciones (priceRanges) fuera del lock: el queryBuilder
          // con FOR UPDATE de arriba no trae relaciones eager (por la misma razon
          // que no se le pueden agregar joins).
          const productWithRanges = await manager.findOne(Product, {
            where: { id: productId },
          });
          const unitPrice = resolveUnitPriceForQuantity(
            productWithRanges!.priceRanges,
            quantity,
          );

          const category = await manager.findOne(CommissionCategory, {
            where: { id: lockedProduct.commissionCategoryId },
          });
          if (!category) {
            throw new NotFoundException(
              `Categoria de comision no encontrada para "${lockedProduct.name}"`,
            );
          }

          const { subtotal, netAmount, taxAmount, commissionAmount, payoutAmount } =
            this.computeOrderAmounts(
              unitPrice,
              quantity,
              Number(category.commissionPercentage),
            );

          await manager.update(Product, productId, {
            reservedStock: lockedProduct.reservedStock + quantity,
          });

          const order = manager.create(Order, {
            quoteRequestId: null,
            buyerId,
            providerId: lockedProduct.providerId,
            productId,
            quantity,
            unitPrice,
            subtotal,
            taxAmount,
            netAmount,
            commissionPercentage: Number(category.commissionPercentage),
            commissionAmount,
            payoutAmount,
            status: OrderStatus.CREADA,
            deliveryType,
            deliveryAddress: resolvedDeliveryAddress,
            paymentMethod: dto.paymentMethod,
            cardLast4: dto.paymentMethod === PaymentMethod.TARJETA ? dto.cardLast4 ?? null : null,
          });

          const savedOrder = await manager.save(order);

          await manager.save(
            manager.create(OrderStatusHistory, {
              orderId: savedOrder.id,
              previousStatus: null,
              newStatus: OrderStatus.CREADA,
              notes: 'Orden generada automaticamente desde el carrito de compras (compra directa, sin cotizacion)',
            }),
          );

          createdOrders.push(savedOrder);
        }

        return createdOrders;
      });
    } catch (err) {
      if (err?.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Hubo un conflicto al procesar el carrito (probablemente un doble clic). Refresca la pagina e intenta de nuevo.',
        );
      }
      throw err;
    }
  }
}
