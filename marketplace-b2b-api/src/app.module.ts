import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { ProvidersModule } from './providers/providers.module';
import { BuyersModule } from './buyers/buyers.module';
import { ProductsModule } from './products/products.module';
import { CommissionCategoriesModule } from './commission-categories/commission-categories.module';
import { QuotesModule } from './quotes/quotes.module';
import { OrdersModule } from './orders/orders.module';
import { SettlementsModule } from './settlements/settlements.module';
import { CommissionChargesModule } from './commission-charges/commission-charges.module';
import { ClaimsModule } from './claims/claims.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    AuthModule,
    ProvidersModule,
    BuyersModule,
    ProductsModule,
    CommissionCategoriesModule,
    QuotesModule,
    OrdersModule,
    SettlementsModule,
    CommissionChargesModule,
    ClaimsModule,
    UploadsModule,
  ],
})
export class AppModule {}
