import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { QuoteRequest } from '../quotes/entities/quote-request.entity';
import { CommissionCategory } from '../commission-categories/entities/commission-category.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductsModule } from '../products/products.module';
import { CommissionCharge } from '../commission-charges/entities/commission-charge.entity';
import { Buyer } from '../buyers/entities/buyer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatusHistory,
      QuoteRequest,
      CommissionCategory,
      CommissionCharge,
      Buyer,
    ]),
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
