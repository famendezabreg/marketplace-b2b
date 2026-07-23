import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ClaimStatus } from '../../common/enums/claim-status.enum';

const RESOLVABLE_STATUSES = [
  ClaimStatus.REEMBOLSO_APROBADO,
  ClaimStatus.CAMBIO_APROBADO,
  ClaimStatus.RECHAZADO,
];

export class ResolveClaimDto {
  @ApiProperty({
    enum: RESOLVABLE_STATUSES,
    description: 'Resolucion del reclamo (no se puede volver a "pendiente")',
  })
  @IsEnum(ClaimStatus)
  status: ClaimStatus;

  @ApiPropertyOptional({
    description: 'Notas para el comprador (ej. motivo del rechazo, instrucciones de cambio)',
  })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Solo si status es "reembolso_aprobado". Si se omite, se usa el total de la orden.',
  })
  @ValidateIf((dto) => dto.status === ClaimStatus.REEMBOLSO_APROBADO)
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  refundAmount?: number;
}
