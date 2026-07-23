import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Buyer } from '../../buyers/entities/buyer.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { Product } from '../../products/entities/product.entity';
import { QuoteRequest } from '../../quotes/entities/quote-request.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { DeliveryType } from '../../common/enums/delivery-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { OrderStatusHistory } from './order-status-history.entity';
import { CommissionCharge } from '../../commission-charges/entities/commission-charge.entity';
import { Claim } from '../../claims/entities/claim.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable: las ordenes generadas desde el carrito de compras (compra directa,
  // sin negociacion de precio) no tienen una cotizacion asociada. Las que vienen
  // del flujo tradicional (solicitar -> responder -> aceptar cotizacion) si la tienen.
  @OneToOne(() => QuoteRequest, { eager: true, onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'quoteRequestId' })
  quoteRequest: QuoteRequest | null;

  @Column({ nullable: true })
  quoteRequestId: string | null;

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

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 12, scale: 2 })
  unitPrice: number;

  // Monto bruto de la orden (quantity * unitPrice)
  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;

  // Impuestos aplicados (no forman parte de la base de comision)
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  // subtotal - descuentos, SIN impuestos. Es la base sobre la que se calcula la comision.
  @Column('decimal', { precision: 12, scale: 2 })
  netAmount: number;

  // Porcentaje de comision aplicado (copiado de la categoria al momento de crear la orden,
  // para que cambios futuros en la categoria no alteren ordenes historicas)
  @Column('decimal', { precision: 5, scale: 2 })
  commissionPercentage: number;

  @Column('decimal', { precision: 12, scale: 2 })
  commissionAmount: number;

  // Lo que se le debe pagar al proveedor = netAmount - commissionAmount
  @Column('decimal', { precision: 12, scale: 2 })
  payoutAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREADA,
  })
  status: OrderStatus;

  // true una vez que ya fue incluida en una liquidacion (Settlement)
  @Column({ default: false })
  isSettled: boolean;

  // Copiado de la QuoteRequest al momento de generar la orden, para que cambios
  // futuros en el perfil del comprador no alteren donde se debia entregar esta orden.
  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.DIRECCION_REGISTRADA,
  })
  deliveryType: DeliveryType;

  // Direccion final de entrega resuelta al crear la orden: la de otra_direccion si aplica,
  // la registrada del comprador si es direccion_registrada, o null si es recoger_en_local.
  @Column({ nullable: true, type: 'text' })
  deliveryAddress: string | null;

  // Copiado de la QuoteRequest al momento de generar la orden.
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.TARJETA,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true, type: 'varchar', length: 4 })
  cardLast4: string | null;

  // Solo existe si paymentMethod = EFECTIVO_CONTRA_ENTREGA: se crea automaticamente
  // cuando la orden pasa a "recibida" (ver OrdersService.updateStatus). Representa la
  // comision que el PROVEEDOR le debe a la plataforma (direccion de cobro invertida
  // respecto al pago con tarjeta, donde es la plataforma quien le debe al proveedor).
  @OneToOne(() => CommissionCharge, (charge) => charge.order)
  commissionCharge: CommissionCharge | null;

  // Reclamo del comprador sobre esta orden, si existe (producto llego mal). Ver nota
  // en la entidad Claim: aprobar un reembolso NO afecta la comision de la plataforma.
  @OneToOne(() => Claim, (claim) => claim.order, { nullable: true })
  claim: Claim | null;

  @OneToMany(() => OrderStatusHistory, (history) => history.order, {
    cascade: true,
  })
  statusHistory: OrderStatusHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
