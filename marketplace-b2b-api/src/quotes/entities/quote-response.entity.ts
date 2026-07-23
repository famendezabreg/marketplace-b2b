import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { QuoteRequest } from './quote-request.entity';

@Entity('quote_responses')
export class QuoteResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => QuoteRequest, (request) => request.response, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quoteRequestId' })
  quoteRequest: QuoteRequest;

  @Column()
  quoteRequestId: string;

  // Precio unitario calculado automaticamente segun el rango de volumen
  // (el proveedor puede ajustarlo dentro de un margen, ver QuotesService)
  @Column('decimal', { precision: 12, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalPrice: number;

  @Column({ nullable: true, type: 'text' })
  providerNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
