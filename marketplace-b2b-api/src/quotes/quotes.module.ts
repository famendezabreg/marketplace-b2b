import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteRequest } from './entities/quote-request.entity';
import { QuoteResponse } from './entities/quote-response.entity';
import { Product } from '../products/entities/product.entity';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteRequest, QuoteResponse, Product]),
    ProductsModule,
    OrdersModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
