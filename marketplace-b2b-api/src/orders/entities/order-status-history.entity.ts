import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column({ type: 'enum', enum: OrderStatus, nullable: true })
  previousStatus: OrderStatus | null;

  @Column({ type: 'enum', enum: OrderStatus })
  newStatus: OrderStatus;

  @Column({ nullable: true })
  changedByUserId: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
