import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { PriceRange } from './entities/price-range.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: any;
  let priceRangesRepository: any;

  beforeEach(async () => {
    productsRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'product-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      manager: {
        transaction: jest.fn(async (cb) =>
          cb({
            findOne: jest.fn(),
            save: jest.fn((entity) => entity),
          }),
        ),
      },
    };

    priceRangesRepository = {
      create: jest.fn((dto) => dto),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productsRepository },
        {
          provide: getRepositoryToken(PriceRange),
          useValue: priceRangesRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('crea un producto valido con rangos de precio', async () => {
      const dto = {
        name: 'Cable HDMI',
        basePrice: 5.99,
        totalStock: 100,
        commissionCategoryId: 'cat-1',
        priceRanges: [
          { minQuantity: 1, maxQuantity: null, unitPrice: 5.99 },
        ],
      } as any;

      const result = await service.create(dto, 'provider-1');
      expect(result.providerId).toBe('provider-1');
      expect(productsRepository.save).toHaveBeenCalled();
    });

    it('rechaza rangos de precio solapados', async () => {
      const dto = {
        name: 'Cable HDMI',
        basePrice: 5.99,
        totalStock: 100,
        commissionCategoryId: 'cat-1',
        priceRanges: [
          { minQuantity: 1, maxQuantity: 50, unitPrice: 5.99 },
          { minQuantity: 40, maxQuantity: 100, unitPrice: 4.99 },
        ],
      } as any;

      await expect(service.create(dto, 'provider-1')).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el producto no existe', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('control de acceso a nivel de recurso', () => {
    it('impide que un proveedor edite el producto de otro proveedor', async () => {
      productsRepository.findOne.mockResolvedValue({
        id: 'product-1',
        providerId: 'provider-A',
      });

      await expect(
        service.update('product-1', { name: 'Nuevo nombre' } as any, 'provider-B'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('impide que un proveedor elimine el producto de otro proveedor', async () => {
      productsRepository.findOne.mockResolvedValue({
        id: 'product-1',
        providerId: 'provider-A',
      });

      await expect(
        service.remove('product-1', 'provider-B'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite que el proveedor dueño edite su propio producto', async () => {
      productsRepository.findOne.mockResolvedValue({
        id: 'product-1',
        providerId: 'provider-A',
        priceRanges: [],
      });

      const result = await service.update(
        'product-1',
        { name: 'Nuevo nombre' } as any,
        'provider-A',
      );
      expect(productsRepository.save).toHaveBeenCalled();
    });
  });
});
