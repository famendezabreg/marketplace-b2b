import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';
import { Order } from '../../orders/entities/order.entity';
import { SettlementStatus } from '../../common/enums/settlement-status.enum';

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, { eager: true })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column()
  providerId: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  // Suma de netAmount de todas las ordenes incluidas
  @Column('decimal', { precision: 14, scale: 2 })
  totalSales: number;

  // Suma de commissionAmount de todas las ordenes incluidas
  @Column('decimal', { precision: 14, scale: 2 })
  totalCommission: number;

  // totalSales - totalCommission = monto a pagar al proveedor
  @Column('decimal', { precision: 14, scale: 2 })
  totalPayout: number;

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDIENTE,
  })
  status: SettlementStatus;

  @ManyToMany(() => Order)
  @JoinTable({
    name: 'settlement_orders',
    joinColumn: { name: 'settlementId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'orderId', referencedColumnName: 'id' },
  })
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;
}
