import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty({ description: 'ID del proveedor a liquidar' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  periodEnd: string;
}
