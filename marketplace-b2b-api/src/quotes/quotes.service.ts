import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteRequest } from './entities/quote-request.entity';
import { QuoteResponse } from './entities/quote-response.entity';
import { Product } from '../products/entities/product.entity';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { QuoteRequestStatus } from '../common/enums/quote-status.enum';
import { DeliveryType } from '../common/enums/delivery-type.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { resolveUnitPriceForQuantity } from '../products/pricing.util';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

// Codigo de error de Postgres para violacion de restriccion unica (unique_violation)
const POSTGRES_UNIQUE_VIOLATION = '23505';

// Margen maximo (%) que un proveedor puede ajustar el precio calculado automaticamente
const MAX_PRICE_ADJUSTMENT_PERCENTAGE = 15;

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(QuoteRequest)
    private quoteRequestsRepository: Repository<QuoteRequest>,
    @InjectRepository(QuoteResponse)
    private quoteResponsesRepository: Repository<QuoteResponse>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private productsService: ProductsService,
    private ordersService: OrdersService,
  ) {}

  async createQuoteRequest(dto: CreateQuoteRequestDto, buyerId: string) {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }

    if (product.availableStock < dto.requestedQuantity) {
      throw new BadRequestException(
        'No hay stock disponible suficiente para la cantidad solicitada',
      );
    }

    // Se calcula el precio automaticamente aqui para validar que exista un rango aplicable,
    // aunque el precio final se guarda hasta que el proveedor responde.
    resolveUnitPriceForQuantity(product.priceRanges, dto.requestedQuantity);

    const quoteRequest = this.quoteRequestsRepository.create({
      buyerId,
      productId: dto.productId,
      requestedQuantity: dto.requestedQuantity,
      notes: dto.notes,
      status: QuoteRequestStatus.PENDIENTE,
      deliveryType: dto.deliveryType ?? DeliveryType.DIRECCION_REGISTRADA,
      deliveryAddress:
        dto.deliveryType === DeliveryType.OTRA_DIRECCION
          ? dto.deliveryAddress ?? null
          : null,
      paymentMethod: dto.paymentMethod,
      cardLast4: dto.paymentMethod === PaymentMethod.TARJETA ? dto.cardLast4 ?? null : null,
    });

    return this.quoteRequestsRepository.save(quoteRequest);
  }

  /**
   * Un comprador solo ve sus propias cotizaciones.
   * Un proveedor solo ve las cotizaciones de sus propios productos (nunca las de otros proveedores).
   */
  async findAll(params: {
    buyerId?: string;
    providerId?: string;
    status?: QuoteRequestStatus;
  }) {
    const query = this.quoteRequestsRepository
      .createQueryBuilder('qr')
      .leftJoinAndSelect('qr.buyer', 'buyer')
      .leftJoinAndSelect('qr.product', 'product')
      .leftJoinAndSelect('qr.response', 'response');

    if (params.buyerId) {
      query.andWhere('qr.buyerId = :buyerId', { buyerId: params.buyerId });
    }

    if (params.providerId) {
      query.andWhere('product.providerId = :providerId', {
        providerId: params.providerId,
      });
    }

    if (params.status) {
      query.andWhere('qr.status = :status', { status: params.status });
    }

    return query.orderBy('qr.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const quoteRequest = await this.quoteRequestsRepository.findOne({
      where: { id },
      relations: ['response'],
    });
    if (!quoteRequest) {
      throw new NotFoundException('Solicitud de cotizacion no encontrada');
    }
    return quoteRequest;
  }

  /**
   * El proveedor responde con el precio (calculado automaticamente o ajustado dentro del margen permitido).
   * Aislamiento de cotizaciones: solo el proveedor dueño del producto puede responder.
   *
   * FIX (bug #12 del historial): antes, la lectura+validacion+insercion de la respuesta
   * no tenia ningun lock. Si dos peticiones "responder" llegaban casi al mismo tiempo
   * (ej. doble click, doble evento de submit), ambas podian leer status === PENDIENTE
   * antes de que cualquiera alcanzara a actualizarlo, y ambas intentaban insertar una
   * QuoteResponse para la misma QuoteRequest -> choque con la restriccion unica de
   * Postgres sobre "quoteRequestId", propagado crudo como error 500.
   *
   * Fix: se envuelve todo en una transaccion con lock pesimista (pessimistic_write)
   * sobre la fila de QuoteRequest, igual que se hizo con el stock en ProductsService.
   * Con el lock, la segunda peticion concurrente queda bloqueada hasta que la primera
   * termine su transaccion (incluyendo el cambio de status a RESPONDIDA), y al reanudarse
   * ve status !== PENDIENTE, por lo que falla limpio con un 400 (no un 500 ni un choque
   * de constraint). El try/catch de abajo queda como defensa adicional por si algun caso
   * raro se escapa del lock (ej. una respuesta insertada por fuera de este metodo).
   *
   * Nota: el lock se hace sin relaciones (igual que en Product) porque QuoteRequest tiene
   * relaciones eager (buyer, product) que generarian LEFT JOIN, y Postgres no permite
   * FOR UPDATE sobre el lado nullable de un outer join.
   */
  async respond(id: string, dto: RespondQuoteDto, providerId: string) {
    try {
      return await this.quoteRequestsRepository.manager.transaction(
        async (manager) => {
          const quoteRequest = await manager
            .createQueryBuilder(QuoteRequest, 'qr')
            .setLock('pessimistic_write')
            .where('qr.id = :id', { id })
            .getOne();

          if (!quoteRequest) {
            throw new NotFoundException('Solicitud de cotizacion no encontrada');
          }

          const product = await manager.findOne(Product, {
            where: { id: quoteRequest.productId },
          });

          if (!product) {
            throw new NotFoundException('Producto no encontrado');
          }

          if (product.providerId !== providerId) {
            throw new ForbiddenException(
              'No puedes responder cotizaciones de productos de otro proveedor',
            );
          }

          if (quoteRequest.status !== QuoteRequestStatus.PENDIENTE) {
            throw new BadRequestException(
              `La cotizacion ya fue procesada (estado actual: ${quoteRequest.status})`,
            );
          }

          const calculatedUnitPrice = resolveUnitPriceForQuantity(
            product.priceRanges,
            quoteRequest.requestedQuantity,
          );

          let finalUnitPrice = calculatedUnitPrice;

          if (dto.adjustedUnitPrice !== undefined) {
            const maxDeviation =
              calculatedUnitPrice * (MAX_PRICE_ADJUSTMENT_PERCENTAGE / 100);
            const diff = Math.abs(dto.adjustedUnitPrice - calculatedUnitPrice);

            if (diff > maxDeviation) {
              throw new BadRequestException(
                `El precio ajustado (${dto.adjustedUnitPrice}) se sale del margen permitido de +/-${MAX_PRICE_ADJUSTMENT_PERCENTAGE}% sobre el precio calculado (${calculatedUnitPrice})`,
              );
            }

            finalUnitPrice = dto.adjustedUnitPrice;
          }

          const totalPrice = finalUnitPrice * quoteRequest.requestedQuantity;

          // Dentro de una transaccion se usa `manager.save`/`manager.create`, no los
          // repositorios inyectados por fuera, o el lock no aplica a estas operaciones.
          const response = await manager.save(
            manager.create(QuoteResponse, {
              quoteRequest, // se asigna el objeto de la relacion, no solo el id plano:
              // en relaciones OneToOne bidireccionales, TypeORM ignora el valor de la
              // columna FK si solo se asigna "quoteRequestId" sin la relacion en si.
              quoteRequestId: quoteRequest.id,
              unitPrice: finalUnitPrice,
              totalPrice,
              providerNotes: dto.providerNotes,
            }),
          );

          await manager.update(QuoteRequest, quoteRequest.id, {
            status: QuoteRequestStatus.RESPONDIDA,
          });

          return response;
        },
      );
    } catch (err) {
      if (err?.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Esta cotizacion ya fue respondida (probablemente por una peticion duplicada). Refresca la pagina para ver la respuesta actual.',
        );
      }
      throw err;
    }
  }

  /**
   * El comprador acepta la cotizacion: se reserva el stock del proveedor
   * y se genera automaticamente la orden de compra correspondiente.
   */
  async accept(id: string, buyerId: string) {
    const quoteRequest = await this.findOne(id);

    if (quoteRequest.buyerId !== buyerId) {
      throw new ForbiddenException('No puedes aceptar cotizaciones de otro comprador');
    }

    if (quoteRequest.status !== QuoteRequestStatus.RESPONDIDA) {
      throw new BadRequestException(
        'Solo se pueden aceptar cotizaciones que ya fueron respondidas por el proveedor',
      );
    }

    // Reserva el stock del proveedor hasta que la orden se confirme o cancele
    await this.productsService.reserveStock(
      quoteRequest.productId,
      quoteRequest.requestedQuantity,
    );

    quoteRequest.status = QuoteRequestStatus.ACEPTADA;
    await this.quoteRequestsRepository.update(quoteRequest.id, {
      status: QuoteRequestStatus.ACEPTADA,
    });

    return this.ordersService.createFromAcceptedQuote(quoteRequest.id);
  }

  async reject(id: string, buyerId: string) {
    const quoteRequest = await this.findOne(id);

    if (quoteRequest.buyerId !== buyerId) {
      throw new ForbiddenException('No puedes rechazar cotizaciones de otro comprador');
    }

    if (
      quoteRequest.status !== QuoteRequestStatus.RESPONDIDA &&
      quoteRequest.status !== QuoteRequestStatus.PENDIENTE
    ) {
      throw new BadRequestException(
        'Esta cotizacion ya no puede ser rechazada en su estado actual',
      );
    }

    quoteRequest.status = QuoteRequestStatus.RECHAZADA;
    await this.quoteRequestsRepository.update(quoteRequest.id, {
      status: QuoteRequestStatus.RECHAZADA,
    });
    return this.quoteRequestsRepository.findOne({ where: { id: quoteRequest.id } });
  }
}
