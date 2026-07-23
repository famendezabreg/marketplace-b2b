import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Buyer } from '../../buyers/entities/buyer.entity';
import { Product } from '../../products/entities/product.entity';
import { QuoteRequestStatus } from '../../common/enums/quote-status.enum';
import { DeliveryType } from '../../common/enums/delivery-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { QuoteResponse } from './quote-response.entity';

@Entity('quote_requests')
export class QuoteRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Buyer, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyerId' })
  buyer: Buyer;

  @Column()
  buyerId: string;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column('int')
  requestedQuantity: number;

  @Column({
    type: 'enum',
    enum: QuoteRequestStatus,
    default: QuoteRequestStatus.PENDIENTE,
  })
  status: QuoteRequestStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.DIRECCION_REGISTRADA,
  })
  deliveryType: DeliveryType;

  // Solo se usa cuando deliveryType = OTRA_DIRECCION. Se copia a la Order al aceptar la cotizacion.
  @Column({ nullable: true, type: 'text' })
  deliveryAddress: string | null;

  // El comprador elige el metodo de pago aqui, al solicitar la cotizacion (antes de que
  // exista la orden). El default a nivel de columna (TARJETA) es solo una salvaguarda de
  // base de datos para filas existentes -- el DTO de creacion exige el campo explicitamente.
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.TARJETA,
  })
  paymentMethod: PaymentMethod;

  // Solo se usa cuando paymentMethod = TARJETA, y solo para mostrar (ej. "termina en 4242").
  // Nunca se guarda el numero completo de tarjeta ni CVV -- el "cobro" es simulado
  // y se resuelve enteramente en el frontend, el backend solo recibe los ultimos 4 digitos.
  @Column({ nullable: true, type: 'varchar', length: 4 })
  cardLast4: string | null;

  @OneToOne(() => QuoteResponse, (response) => response.quoteRequest, {
    nullable: true,
  })
  response: QuoteResponse;

  // Fecha limite para que el proveedor responda o el comprador acepte/rechace
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
