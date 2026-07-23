import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PriceRangeDto } from './price-range.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Cable HDMI 2m' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL publica de una imagen del producto (opcional).',
    example: 'https://ejemplo.com/imagenes/producto.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl debe ser una URL valida' })
  imageUrl?: string;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  totalStock: number;

  @ApiProperty({ description: 'ID de la categoria de comision' })
  @IsUUID()
  commissionCategoryId: string;

  @ApiProperty({
    type: [PriceRangeDto],
    description:
      'Rangos de precio por volumen. Deben cubrir de forma continua y sin solapamiento.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PriceRangeDto)
  priceRanges: PriceRangeDto[];
}
