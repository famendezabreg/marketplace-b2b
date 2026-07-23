import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { DeliveryType } from '../../common/enums/delivery-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class CreateQuoteRequestDto {
  @ApiProperty({ description: 'ID del producto a cotizar' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  requestedQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    enum: DeliveryType,
    description:
      'Como el comprador quiere recibir el pedido: en su direccion registrada, en otra direccion, o recogiendo en el local del proveedor.',
    default: DeliveryType.DIRECCION_REGISTRADA,
  })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType = DeliveryType.DIRECCION_REGISTRADA;

  @ApiPropertyOptional({
    description: 'Requerida solo cuando deliveryType es "otra_direccion".',
  })
  @ValidateIf((dto) => dto.deliveryType === DeliveryType.OTRA_DIRECCION)
  @IsString()
  @IsNotEmpty({ message: 'deliveryAddress es requerida cuando deliveryType es "otra_direccion"' })
  deliveryAddress?: string;

  @ApiProperty({
    enum: PaymentMethod,
    description:
      'Como el comprador va a pagar: tarjeta (simulada, se cobra a la plataforma de inmediato) o efectivo contra entrega (se le paga al proveedor directamente al recibir).',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Ultimos 4 digitos de la tarjeta simulada, solo para mostrar (ej. "4242"). Requerido cuando paymentMethod es "tarjeta". Nunca se envia ni se guarda el numero completo ni el CVV.',
  })
  @ValidateIf((dto) => dto.paymentMethod === PaymentMethod.TARJETA)
  @IsString()
  @Length(4, 4, { message: 'cardLast4 debe tener exactamente 4 digitos' })
  @Matches(/^\d{4}$/, { message: 'cardLast4 debe contener solo digitos' })
  cardLast4?: string;
}
