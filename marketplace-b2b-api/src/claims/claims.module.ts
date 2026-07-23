import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from './entities/claim.entity';
import { Order } from '../orders/entities/order.entity';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Claim, Order])],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
