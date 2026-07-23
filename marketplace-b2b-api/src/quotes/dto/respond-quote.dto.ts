import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RespondQuoteDto {
  @ApiPropertyOptional({
    description:
      'Precio unitario ajustado por el proveedor. Si se omite, se usa el precio calculado automaticamente segun el rango de volumen. El ajuste manual se limita a +/-15% del precio calculado.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustedUnitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerNotes?: string;
}
