import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class PriceRangeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  minQuantity: number;

  @ApiPropertyOptional({
    example: 99,
    description: 'Null = sin limite superior',
  })
  @IsOptional()
  @IsInt()
  maxQuantity?: number | null;

  @ApiProperty({ example: 10.5 })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}
