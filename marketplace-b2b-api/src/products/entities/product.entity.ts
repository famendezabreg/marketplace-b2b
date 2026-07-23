import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';
import { CommissionCategory } from '../../commission-categories/entities/commission-category.entity';
import { PriceRange } from './price-range.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, (provider) => provider.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column()
  providerId: string;

  @ManyToOne(() => CommissionCategory, (category) => category.products, {
    eager: true,
  })
  @JoinColumn({ name: 'commissionCategoryId' })
  commissionCategory: CommissionCategory;

  @Column()
  commissionCategoryId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  // URL de la imagen del producto (mostrada en catalogo y en "Mis productos").
  // No hay almacenamiento de archivos propio en este proyecto: se guarda una URL externa.
  @Column({ nullable: true, type: 'text' })
  imageUrl: string | null;

  @Column('decimal', { precision: 12, scale: 2 })
  basePrice: number;

  // Stock total (disponible + reservado)
  @Column('int', { default: 0 })
  totalStock: number;

  // Stock reservado por cotizaciones aceptadas pendientes de confirmar/cancelar orden
  @Column('int', { default: 0 })
  reservedStock: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => PriceRange, (priceRange) => priceRange.product, {
    cascade: true,
    eager: true,
  })
  priceRanges: PriceRange[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Stock realmente disponible para nuevas cotizaciones
  get availableStock(): number {
    return this.totalStock - this.reservedStock;
  }
}
