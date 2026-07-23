import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { QuoteRequest } from '../quotes/entities/quote-request.entity';
import { CommissionCategory } from '../commission-categories/entities/commission-category.entity';
import { CommissionCharge } from '../commission-charges/entities/commission-charge.entity';
import { Product } from '../products/entities/product.entity';
import { Buyer } from '../buyers/entities/buyer.entity';
import { ProductsService } from '../products/products.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { DeliveryType } from '../common/enums/delivery-type.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: any;
  let statusHistoryRepository: any;
  let quoteRequestsRepository: any;
  let commissionCategoriesRepository: any;
  let buyersRepository: any;
  let productsService: any;

  // Usados por el mock de manager.transaction() en updateStatus() y checkoutCart():
  // simulan lo que devolverian los locks pesimistas y los findOne dentro de la transaccion.
  let lockedOrder: any;
  let existingCommissionCharge: any;
  let lockedProducts: Record<string, any>;
  let productsWithRanges: Record<string, any>;
  let commissionCategoriesById: Record<string, any>;

  function buildManagerMock() {
    let capturedProductId: string | undefined;
    return {
      createQueryBuilder: jest.fn((entity: any) => {
        if (entity === Order) {
          return {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn(() => lockedOrder),
          };
        }
        if (entity === Product) {
          return {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn((_clause: string, params: any) => {
              capturedProductId = params.id;
              return {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(() => lockedProducts[capturedProductId!]),
              };
            }),
            getOne: jest.fn(() => lockedProducts[capturedProductId!]),
          };
        }
        throw new Error(`createQueryBuilder mock: entidad no soportada: ${entity}`);
      }),
      findOne: jest.fn((entity: any, opts: any) => {
        if (entity === CommissionCharge) return existingCommissionCharge;
        if (entity === Product) return productsWithRanges[opts.where.id];
        if (entity === CommissionCategory) return commissionCategoriesById[opts.where.id];
        return null;
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((_entity: any, dto: any) => dto),
      save: jest.fn((entity: any) =>
        Promise.resolve({ id: entity.id ?? `generated-${Math.random()}`, ...entity }),
      ),
    };
  }

  beforeEach(async () => {
    lockedOrder = null;
    existingCommissionCharge = null;
    lockedProducts = {};
    productsWithRanges = {};
    commissionCategoriesById = {};

    ordersRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'order-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(async (cb) => cb(buildManagerMock())),
      },
    };
    statusHistoryRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    quoteRequestsRepository = { findOne: jest.fn() };
    commissionCategoriesRepository = { findOne: jest.fn() };
    buyersRepository = { findOne: jest.fn() };
    productsService = { commitStock: jest.fn(), releaseStock: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
        {
          provide: getRepositoryToken(OrderStatusHistory),
          useValue: statusHistoryRepository,
        },
        {
          provide: getRepositoryToken(QuoteRequest),
          useValue: quoteRequestsRepository,
        },
        {
          provide: getRepositoryToken(CommissionCategory),
          useValue: commissionCategoriesRepository,
        },
        { provide: getRepositoryToken(Buyer), useValue: buyersRepository },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createFromAcceptedQuote - calculo de comision sobre monto neto', () => {
    it('calcula subtotal, comision y payout correctamente', async () => {
      quoteRequestsRepository.findOne.mockResolvedValue({
        id: 'quote-1',
        buyerId: 'buyer-1',
        productId: 'product-1',
        requestedQuantity: 100,
        product: { providerId: 'provider-1', commissionCategoryId: 'cat-1' },
        response: { unitPrice: 10 },
      });
      commissionCategoriesRepository.findOne.mockResolvedValue({
        id: 'cat-1',
        commissionPercentage: 10,
      });

      const order = await service.createFromAcceptedQuote('quote-1');

      // subtotal = 100 * 10 = 1000 (precio ya incluye IVA 13%)
      // netAmount = 1000 / 1.13 = 884.96; taxAmount = 1000 - 884.96 = 115.04
      // comision 10% sobre neto = 88.50; payout = 884.96 - 88.50 = 796.46
      expect(order.subtotal).toBe(1000);
      expect(order.taxAmount).toBe(115.04);
      expect(order.netAmount).toBe(884.96);
      expect(order.commissionAmount).toBe(88.5);
      expect(order.payoutAmount).toBe(796.46);
      expect(order.status).toBe(OrderStatus.CREADA);
    });
  });

  describe('updateStatus - transiciones validas', () => {
    it('permite pasar de creada a confirmada y descuenta el stock', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.CREADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
      };

      await service.updateStatus(
        'order-1',
        { status: OrderStatus.CONFIRMADA },
        { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
      );

      expect(productsService.commitStock).toHaveBeenCalledWith('product-1', 10);
    });

    it('rechaza una transicion invalida (ej. de creada a despachada)', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.CREADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
      };

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.DESPACHADA },
          { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('libera el stock reservado cuando la orden se cancela', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.CREADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
      };

      await service.updateStatus(
        'order-1',
        { status: OrderStatus.CANCELADA },
        { id: 'buyer-user-1', role: UserRole.COMPRADOR, buyerId: 'buyer-1' },
      );

      expect(productsService.releaseStock).toHaveBeenCalledWith('product-1', 10);
    });

    it('impide que un comprador cambie a un estado distinto de cancelada', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.CREADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
      };

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.CONFIRMADA },
          { id: 'buyer-user-1', role: UserRole.COMPRADOR, buyerId: 'buyer-1' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('impide que un participante ajeno a la orden la modifique', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.CREADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
      };

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.CANCELADA },
          { id: 'other-buyer', role: UserRole.COMPRADOR, buyerId: 'buyer-2' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la orden no existe', async () => {
      lockedOrder = null;

      await expect(
        service.updateStatus(
          'order-x',
          { status: OrderStatus.CONFIRMADA },
          { id: 'user-1', role: UserRole.ADMIN },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cobro automatico de comision en pagos por efectivo contra entrega', () => {
    it('genera un CommissionCharge cuando una orden en efectivo pasa a "recibida"', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.DESPACHADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        paymentMethod: PaymentMethod.EFECTIVO_CONTRA_ENTREGA,
        commissionAmount: 42.5,
      };
      existingCommissionCharge = null;

      const savedManager = buildManagerMock();
      ordersRepository.manager.transaction = jest.fn(async (cb) => cb(savedManager));

      await service.updateStatus(
        'order-1',
        { status: OrderStatus.RECIBIDA },
        { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
      );

      expect(savedManager.create).toHaveBeenCalledWith(
        CommissionCharge,
        expect.objectContaining({
          orderId: 'order-1',
          providerId: 'provider-1',
          amount: 42.5,
        }),
      );
    });

    it('NO genera un CommissionCharge cuando una orden pagada con tarjeta pasa a "recibida"', async () => {
      lockedOrder = {
        id: 'order-2',
        status: OrderStatus.DESPACHADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        paymentMethod: PaymentMethod.TARJETA,
        commissionAmount: 42.5,
      };

      const savedManager = buildManagerMock();
      ordersRepository.manager.transaction = jest.fn(async (cb) => cb(savedManager));

      await service.updateStatus(
        'order-2',
        { status: OrderStatus.RECIBIDA },
        { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
      );

      expect(savedManager.create).not.toHaveBeenCalledWith(
        CommissionCharge,
        expect.anything(),
      );
    });

    it('FIX bug duplicate-key: no crea un segundo CommissionCharge si ya existe uno para la orden', async () => {
      // Simula el escenario del bug real: un intento anterior (doble clic / condicion de
      // carrera) ya habia creado el CommissionCharge, pero el status de la orden se quedo
      // sin guardar. Reintentar "marcar recibida" debe completarse sin duplicar el cobro.
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.DESPACHADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        paymentMethod: PaymentMethod.EFECTIVO_CONTRA_ENTREGA,
        commissionAmount: 42.5,
      };
      existingCommissionCharge = { id: 'charge-existente', orderId: 'order-1' };

      const savedManager = buildManagerMock();
      ordersRepository.manager.transaction = jest.fn(async (cb) => cb(savedManager));

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.RECIBIDA },
        { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
      );

      expect(savedManager.create).not.toHaveBeenCalledWith(
        CommissionCharge,
        expect.anything(),
      );
      expect(result.status).toBe(OrderStatus.RECIBIDA);
    });

    it('traduce un error 23505 remanente a ConflictException', async () => {
      lockedOrder = {
        id: 'order-1',
        status: OrderStatus.DESPACHADA,
        productId: 'product-1',
        quantity: 10,
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        paymentMethod: PaymentMethod.EFECTIVO_CONTRA_ENTREGA,
        commissionAmount: 42.5,
      };
      ordersRepository.manager.transaction = jest.fn(async () => {
        const err: any = new Error('duplicate key value violates unique constraint');
        err.code = '23505';
        throw err;
      });

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.RECIBIDA },
          { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('checkoutCart - compra directa desde el carrito', () => {
    beforeEach(() => {
      buyersRepository.findOne.mockResolvedValue({
        id: 'buyer-1',
        shippingAddress: 'Direccion del comprador',
      });
    });

    it('crea una orden por producto, con el precio del rango correspondiente', async () => {
      lockedProducts['product-1'] = {
        id: 'product-1',
        name: 'Producto Uno',
        providerId: 'provider-A',
        commissionCategoryId: 'cat-1',
        isActive: true,
        totalStock: 100,
        reservedStock: 0,
      };
      productsWithRanges['product-1'] = {
        ...lockedProducts['product-1'],
        priceRanges: [
          { minQuantity: 1, maxQuantity: 49, unitPrice: 10 },
          { minQuantity: 50, maxQuantity: null, unitPrice: 8 },
        ],
      };
      commissionCategoriesById['cat-1'] = { id: 'cat-1', commissionPercentage: 10 };

      const orders = await service.checkoutCart('buyer-1', {
        items: [{ productId: 'product-1', quantity: 60 }],
        deliveryType: DeliveryType.DIRECCION_REGISTRADA,
        paymentMethod: PaymentMethod.TARJETA,
        cardLast4: '4242',
      } as any);

      expect(orders).toHaveLength(1);
      expect(orders[0].unitPrice).toBe(8); // cae en el rango de 50+
      expect(orders[0].subtotal).toBe(480); // 60 * 8
      expect(orders[0].providerId).toBe('provider-A');
      expect(orders[0].quoteRequestId).toBeNull();
      expect(orders[0].deliveryAddress).toBe('Direccion del comprador');
    });

    it('agrupa productos de distintos proveedores en ordenes separadas', async () => {
      lockedProducts['product-1'] = {
        id: 'product-1',
        name: 'Producto Uno',
        providerId: 'provider-A',
        commissionCategoryId: 'cat-1',
        isActive: true,
        totalStock: 100,
        reservedStock: 0,
      };
      lockedProducts['product-2'] = {
        id: 'product-2',
        name: 'Producto Dos',
        providerId: 'provider-B',
        commissionCategoryId: 'cat-1',
        isActive: true,
        totalStock: 100,
        reservedStock: 0,
      };
      productsWithRanges['product-1'] = {
        ...lockedProducts['product-1'],
        priceRanges: [{ minQuantity: 1, maxQuantity: null, unitPrice: 5 }],
      };
      productsWithRanges['product-2'] = {
        ...lockedProducts['product-2'],
        priceRanges: [{ minQuantity: 1, maxQuantity: null, unitPrice: 20 }],
      };
      commissionCategoriesById['cat-1'] = { id: 'cat-1', commissionPercentage: 5 };

      const orders = await service.checkoutCart('buyer-1', {
        items: [
          { productId: 'product-1', quantity: 5 },
          { productId: 'product-2', quantity: 2 },
        ],
        deliveryType: DeliveryType.RECOGER_EN_LOCAL,
        paymentMethod: PaymentMethod.EFECTIVO_CONTRA_ENTREGA,
      } as any);

      expect(orders).toHaveLength(2);
      const providerIds = orders.map((o: any) => o.providerId).sort();
      expect(providerIds).toEqual(['provider-A', 'provider-B']);
      expect(orders.every((o: any) => o.deliveryAddress === null)).toBe(true);
    });

    it('rechaza el checkout completo si el stock de algun producto no alcanza', async () => {
      lockedProducts['product-1'] = {
        id: 'product-1',
        name: 'Producto Escaso',
        providerId: 'provider-A',
        commissionCategoryId: 'cat-1',
        isActive: true,
        totalStock: 5,
        reservedStock: 3, // solo quedan 2 disponibles
      };
      productsWithRanges['product-1'] = {
        ...lockedProducts['product-1'],
        priceRanges: [{ minQuantity: 1, maxQuantity: null, unitPrice: 5 }],
      };

      await expect(
        service.checkoutCart('buyer-1', {
          items: [{ productId: 'product-1', quantity: 10 }],
          paymentMethod: PaymentMethod.TARJETA,
          cardLast4: '4242',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza el checkout si un producto ya no esta activo', async () => {
      lockedProducts['product-1'] = {
        id: 'product-1',
        name: 'Producto Descontinuado',
        providerId: 'provider-A',
        commissionCategoryId: 'cat-1',
        isActive: false,
        totalStock: 100,
        reservedStock: 0,
      };

      await expect(
        service.checkoutCart('buyer-1', {
          items: [{ productId: 'product-1', quantity: 1 }],
          paymentMethod: PaymentMethod.TARJETA,
          cardLast4: '4242',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
