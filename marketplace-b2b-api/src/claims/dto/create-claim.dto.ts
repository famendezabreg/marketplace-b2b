import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateClaimDto {
  @ApiProperty({ description: 'ID de la orden reclamada (debe estar en estado "recibida")' })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    example: 'El producto llego con la caja aplastada y dos unidades rotas.',
  })
  @IsString()
  @MinLength(10, { message: 'Describe el problema con al menos 10 caracteres' })
  reason: string;

  @ApiProperty({
    type: [String],
    description:
      'Evidencia de las fotos subidas (al menos una). URLs devueltas por POST /uploads/claim-evidence.',
    example: ['http://localhost:3000/uploads/claims/3f1b2c-foto.jpg'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Adjunta al menos una foto como evidencia' })
  @Matches(/^(https?:\/\/|\/uploads\/)/, {
    each: true,
    message: 'Cada evidencia debe ser una URL valida o una ruta de /uploads/',
  })
  evidenceUrls: string[];
}
