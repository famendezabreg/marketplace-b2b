import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('commission_categories')
export class CommissionCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // ej: "Electronica", "Ferreteria", "Alimentos"

  @Column('decimal', { precision: 5, scale: 2 })
  commissionPercentage: number; // ej: 8.50 = 8.5%

  @OneToMany(() => Product, (product) => product.commissionCategory)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
