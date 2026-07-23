import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PriceRange } from './entities/price-range.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { validatePriceRanges } from './pricing.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(PriceRange)
    private priceRangesRepository: Repository<PriceRange>,
  ) {}

  async create(dto: CreateProductDto, providerId: string) {
    validatePriceRanges(dto.priceRanges);

    const product = this.productsRepository.create({
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      basePrice: dto.basePrice,
      totalStock: dto.totalStock,
      reservedStock: 0,
      providerId,
      commissionCategoryId: dto.commissionCategoryId,
      priceRanges: dto.priceRanges.map((range) =>
        this.priceRangesRepository.create(range),
      ),
    });

    return this.productsRepository.save(product);
  }

  findAll(filters?: { providerId?: string; isActive?: boolean }) {
    return this.productsRepository.find({
      where: {
        ...(filters?.providerId ? { providerId: filters.providerId } : {}),
        ...(filters?.isActive !== undefined
          ? { isActive: filters.isActive }
          : {}),
      },
      relations: ['provider'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, requesterProviderId: string) {
    const product = await this.findOne(id);
    this.assertOwnership(product, requesterProviderId);

    if (dto.priceRanges) {
      validatePriceRanges(dto.priceRanges);
      // Se reemplazan todos los rangos existentes por los nuevos (cascade se encarga de guardar)
      await this.priceRangesRepository.delete({ productId: id });
      product.priceRanges = dto.priceRanges.map((range) =>
        this.priceRangesRepository.create(range),
      );
    }

    const { priceRanges, ...rest } = dto;
    Object.assign(product, rest);

    return this.productsRepository.save(product);
  }

  async remove(id: string, requesterProviderId: string) {
    const product = await this.findOne(id);
    this.assertOwnership(product, requesterProviderId);
    await this.productsRepository.remove(product);
    return { deleted: true };
  }

  /**
   * Control de acceso a nivel de recurso: un proveedor solo puede gestionar sus propios productos.
   */
  private assertOwnership(product: Product, requesterProviderId: string) {
    if (product.providerId !== requesterProviderId) {
      throw new ForbiddenException(
        'No puedes gestionar productos de otro proveedor',
      );
    }
  }

  /**
   * Usado internamente por QuotesService/OrdersService para reservar o liberar stock.
   * Se hace con SELECT ... FOR UPDATE (pessimistic lock) para evitar condiciones de carrera
   * cuando dos cotizaciones compiten por el mismo stock al mismo tiempo.
   *
   * Nota: se usa un QueryBuilder explicito (sin relaciones) para el lock, porque
   * Product tiene relaciones eager (commissionCategory, priceRanges) que generan
   * LEFT JOIN, y Postgres no permite FOR UPDATE sobre el lado nullable de un outer join.
   */
  async reserveStock(productId: string, quantity: number) {
    return this.productsRepository.manager.transaction(async (manager) => {
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (product.totalStock - product.reservedStock < quantity) {
        throw new ForbiddenException(
          'Stock disponible insuficiente para reservar esta cantidad',
        );
      }

      await manager.update(Product, productId, {
        reservedStock: product.reservedStock + quantity,
      });
    });
  }

  async releaseStock(productId: string, quantity: number) {
    return this.productsRepository.manager.transaction(async (manager) => {
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      await manager.update(Product, productId, {
        reservedStock: Math.max(0, product.reservedStock - quantity),
      });
    });
  }

  /**
   * Al confirmarse la orden, el stock reservado se descuenta definitivamente del stock total.
   */
  async commitStock(productId: string, quantity: number) {
    return this.productsRepository.manager.transaction(async (manager) => {
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      await manager.update(Product, productId, {
        totalStock: Math.max(0, product.totalStock - quantity),
        reservedStock: Math.max(0, product.reservedStock - quantity),
      });
    });
  }
}
