import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionCategory } from './entities/commission-category.entity';
import { CommissionCategoriesService } from './commission-categories.service';
import { CommissionCategoriesController } from './commission-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionCategory])],
  controllers: [CommissionCategoriesController],
  providers: [CommissionCategoriesService],
  exports: [CommissionCategoriesService],
})
export class CommissionCategoriesModule {}
