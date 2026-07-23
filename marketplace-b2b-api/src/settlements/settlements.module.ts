import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement } from './entities/settlement.entity';
import { Order } from '../orders/entities/order.entity';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Settlement, Order])],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
