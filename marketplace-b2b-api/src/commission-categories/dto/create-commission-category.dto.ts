import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateCommissionCategoryDto {
  @ApiProperty({ example: 'Electronica' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 8.5, description: 'Porcentaje de comision (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage: number;
}
