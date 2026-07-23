import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { CommissionChargeStatus } from '../../common/enums/commission-charge-status.enum';

/**
 * Representa la comision que un PROVEEDOR le debe a la plataforma cuando una orden
 * se pago en efectivo contra entrega (el proveedor recibio el dinero completo
 * directamente del comprador, asi que la plataforma nunca lo toco y debe cobrar
 * su comision aparte). Es la contraparte de Settlement: en Settlement la plataforma
 * le paga al proveedor; aqui el proveedor le paga a la plataforma.
 *
 * Se genera automaticamente una por orden (no en lote como Settlement) al momento
 * en que la orden pasa a estado "recibida", ver OrdersService.updateStatus().
 */
@Entity('commission_charges')
export class CommissionCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Order, (order) => order.commissionCharge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ unique: true })
  orderId: string;

  @ManyToOne(() => Provider, { eager: true })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column()
  providerId: string;

  // Copiado de Order.commissionAmount al momento de crearse (misma logica que
  // commissionPercentage en Order: se congela el valor, no se recalcula despues).
  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: CommissionChargeStatus,
    default: CommissionChargeStatus.PENDIENTE,
  })
  status: CommissionChargeStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
