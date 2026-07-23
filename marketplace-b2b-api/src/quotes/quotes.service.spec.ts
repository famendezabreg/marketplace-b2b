import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuoteRequest } from './entities/quote-request.entity';
import { QuoteResponse } from './entities/quote-response.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { QuoteRequestStatus } from '../common/enums/quote-status.enum';

describe('QuotesService', () => {
  let service: QuotesService;
  let quoteRequestsRepository: any;
  let quoteResponsesRepository: any;
  let productsRepository: any;
  let productsService: any;
  let ordersService: any;
  // Usados por el mock de manager.transaction() en respond(): simulan lo que devolveria
  // el lock pesimista sobre QuoteRequest y el findOne(Product) dentro de la transaccion.
  let lockedQuoteRequest: any;
  let lockedProduct: any;

  const buildProduct = (overrides = {}) => ({
    id: 'product-1',
    providerId: 'provider-A',
    isActive: true,
    totalStock: 100,
    reservedStock: 0,
    priceRanges: [
      { minQuantity: 1, maxQuantity: 49, unitPrice: 5.99 },
      { minQuantity: 50, maxQuantity: null, unitPrice: 4.99 },
    ],
    get availableStock() {
      return this.totalStock - this.reservedStock;
    },
    ...overrides,
  });

  beforeEach(async () => {
    quoteRequestsRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'quote-1', ...entity })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      // respond() ahora corre dentro de una transaccion con lock pesimista (ver fix del
      // bug #12). El manager simulado expone: createQueryBuilder(...).setLock().where().getOne()
      // para el lock sobre QuoteRequest, findOne() para leer el Product, y create/save/update
      // para insertar la QuoteResponse y actualizar el status, todo dentro del callback.
      manager: {
        transaction: jest.fn(async (cb) =>
          cb({
            createQueryBuilder: jest.fn(() => ({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn(() => lockedQuoteRequest),
            })),
            findOne: jest.fn((_entity, _opts) => lockedProduct),
            create: jest.fn((_entity, dto) => dto),
            save: jest.fn((entity) => Promise.resolve({ id: 'response-1', ...entity })),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          }),
        ),
      },
    };
    quoteResponsesRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'response-1', ...entity })),
    };
    productsRepository = { findOne: jest.fn() };
    productsService = { reserveStock: jest.fn() };
    ordersService = { createFromAcceptedQuote: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        {
          provide: getRepositoryToken(QuoteRequest),
          useValue: quoteRequestsRepository,
        },
        {
          provide: getRepositoryToken(QuoteResponse),
          useValue: quoteResponsesRepository,
        },
        { provide: getRepositoryToken(Product), useValue: productsRepository },
        { provide: ProductsService, useValue: productsService },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  describe('createQuoteRequest', () => {
    it('rechaza si el producto no existe o esta inactivo', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      await expect(
        service.createQuoteRequest(
          { productId: 'x', requestedQuantity: 10 } as any,
          'buyer-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si no hay stock disponible suficiente', async () => {
      productsRepository.findOne.mockResolvedValue(
        buildProduct({ totalStock: 5, reservedStock: 0 }),
      );
      await expect(
        service.createQuoteRequest(
          { productId: 'product-1', requestedQuantity: 10 } as any,
          'buyer-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea la solicitud cuando hay stock suficiente', async () => {
      productsRepository.findOne.mockResolvedValue(buildProduct());
      const result = await service.createQuoteRequest(
        { productId: 'product-1', requestedQuantity: 10 } as any,
        'buyer-1',
      );
      expect(result.status).toBe(QuoteRequestStatus.PENDIENTE);
    });
  });

  describe('respond - aislamiento de cotizaciones', () => {
    it('impide que un proveedor responda cotizaciones de productos de otro proveedor', async () => {
      lockedQuoteRequest = {
        id: 'quote-1',
        status: QuoteRequestStatus.PENDIENTE,
        requestedQuantity: 10,
        productId: 'product-1',
      };
      lockedProduct = buildProduct({ providerId: 'provider-A' });

      await expect(
        service.respond('quote-1', {} as any, 'provider-B'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('calcula el precio automaticamente segun el rango de volumen', async () => {
      lockedQuoteRequest = {
        id: 'quote-1',
        status: QuoteRequestStatus.PENDIENTE,
        requestedQuantity: 60,
        productId: 'product-1',
      };
      lockedProduct = buildProduct({ providerId: 'provider-A' });

      const response = await service.respond('quote-1', {} as any, 'provider-A');
      expect(response.unitPrice).toBe(4.99);
      expect(response.totalPrice).toBe(4.99 * 60);
    });

    it('rechaza un ajuste de precio fuera del margen permitido (+/-15%)', async () => {
      lockedQuoteRequest = {
        id: 'quote-1',
        status: QuoteRequestStatus.PENDIENTE,
        requestedQuantity: 10,
        productId: 'product-1',
      };
      lockedProduct = buildProduct({ providerId: 'provider-A' });

      await expect(
        service.respond(
          'quote-1',
          { adjustedUnitPrice: 100 } as any,
          'provider-A',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza responder una cotizacion que ya no esta pendiente (evita el choque de constraint unica)', async () => {
      // Simula el escenario del bug real: la cotizacion ya fue respondida (por ejemplo,
      // por una peticion concurrente que gano la carrera del lock) cuando esta peticion
      // logra tomar el lock. Debe fallar limpio con 400, nunca con un 500 crudo de Postgres.
      lockedQuoteRequest = {
        id: 'quote-1',
        status: QuoteRequestStatus.RESPONDIDA,
        requestedQuantity: 10,
        productId: 'product-1',
      };
      lockedProduct = buildProduct({ providerId: 'provider-A' });

      await expect(
        service.respond('quote-1', {} as any, 'provider-A'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respond - defensa adicional contra choque de constraint unica', () => {
    it('traduce un error 23505 (unique_violation) de Postgres en un ConflictException limpio', async () => {
      quoteRequestsRepository.manager.transaction = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));

      await expect(
        service.respond('quote-1', {} as any, 'provider-A'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('accept', () => {
    it('reserva stock y genera la orden al aceptar', async () => {
      quoteRequestsRepository.findOne.mockResolvedValue({
        id: 'quote-1',
        buyerId: 'buyer-1',
        productId: 'product-1',
        requestedQuantity: 10,
        status: QuoteRequestStatus.RESPONDIDA,
      });

      await service.accept('quote-1', 'buyer-1');

      expect(productsService.reserveStock).toHaveBeenCalledWith('product-1', 10);
      expect(ordersService.createFromAcceptedQuote).toHaveBeenCalledWith('quote-1');
    });

    it('impide que otro comprador acepte la cotizacion', async () => {
      quoteRequestsRepository.findOne.mockResolvedValue({
        id: 'quote-1',
        buyerId: 'buyer-1',
        status: QuoteRequestStatus.RESPONDIDA,
      });

      await expect(service.accept('quote-1', 'buyer-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
