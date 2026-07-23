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
import { Buyer } from '../../buyers/entities/buyer.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ClaimStatus } from '../../common/enums/claim-status.enum';

/**
 * Reclamo del comprador sobre una orden ya recibida (ej. producto llego dañado,
 * incompleto o distinto a lo pedido). Requiere evidencia (URLs de imagenes, mismo
 * patron que Product.imageUrl -- no hay almacenamiento de archivos propio en el
 * proyecto). Lo resuelve el proveedor (fue su venta) o el admin (mediador), ambos
 * con el mismo permiso.
 *
 * IMPORTANTE: aprobar un reembolso NO afecta la comision que el proveedor le debe
 * a la plataforma -- el reembolso es un asunto entre proveedor y comprador (la
 * plataforma solo actuo como intermediaria de la venta, ya gano su comision por
 * conectarlos). Por eso este modulo no toca Settlement ni CommissionCharge.
 */
@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Order, (order) => order.claim, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // Unico: un solo reclamo por orden (evita reclamos duplicados/spam sobre la misma compra).
  @Column({ unique: true })
  orderId: string;

  @ManyToOne(() => Buyer, { eager: true })
  @JoinColumn({ name: 'buyerId' })
  buyer: Buyer;

  @Column()
  buyerId: string;

  @ManyToOne(() => Provider, { eager: true })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column()
  providerId: string;

  @Column('text')
  reason: string;

  // URLs externas de fotos como evidencia (mismo patron que Product.imageUrl).
  // Se guarda como texto separado por comas (simple-array de TypeORM).
  @Column('simple-array')
  evidenceUrls: string[];

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDIENTE,
  })
  status: ClaimStatus;

  // Notas del proveedor/admin al resolver (ej. motivo del rechazo, instrucciones de cambio)
  @Column({ nullable: true, type: 'text' })
  resolutionNotes: string | null;

  // Solo aplica si status = REEMBOLSO_APROBADO. Por defecto el monto total de la orden,
  // pero se puede aprobar un reembolso parcial.
  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  refundAmount: number | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
