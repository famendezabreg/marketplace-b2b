import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionCharge } from './entities/commission-charge.entity';
import { CommissionChargesService } from './commission-charges.service';
import { CommissionChargesController } from './commission-charges.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionCharge])],
  controllers: [CommissionChargesController],
  providers: [CommissionChargesService],
  exports: [CommissionChargesService],
})
export class CommissionChargesModule {}
