import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('price_ranges')
export class PriceRange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.priceRanges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column('int')
  minQuantity: number;

  // null = sin limite superior (rango abierto, ej: "100 en adelante")
  @Column('int', { nullable: true })
  maxQuantity: number | null;

  @Column('decimal', { precision: 12, scale: 2 })
  unitPrice: number;
}
