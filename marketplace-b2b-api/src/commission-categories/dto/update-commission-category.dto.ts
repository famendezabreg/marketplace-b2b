import { PartialType } from '@nestjs/swagger';
import { CreateCommissionCategoryDto } from './create-commission-category.dto';

export class UpdateCommissionCategoryDto extends PartialType(
  CreateCommissionCategoryDto,
) {}
