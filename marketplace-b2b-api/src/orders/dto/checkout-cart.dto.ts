import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { DeliveryType } from '../../common/enums/delivery-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class CartItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * Checkout de carrito: a diferencia del flujo de cotizacion (donde el proveedor
 * negocia/aprueba el precio antes de que exista una orden), esto es compra directa
 * -- se usa el precio del rango de volumen que corresponda, sin aprobacion. Puede
 * incluir productos de varios proveedores; se genera UNA orden normal por producto
 * (mismo modelo de siempre), asi que Liquidaciones/Comisiones no necesitan saber
 * que la orden vino de un carrito.
 */
export class CheckoutCartDto {
  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'El carrito no puede estar vacio' })
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ApiProperty({
    enum: DeliveryType,
    description: 'Aplica a todas las ordenes generadas por este checkout.',
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

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Requerido cuando paymentMethod es "tarjeta". Solo los ultimos 4 digitos.',
  })
  @ValidateIf((dto) => dto.paymentMethod === PaymentMethod.TARJETA)
  @IsString()
  @Length(4, 4, { message: 'cardLast4 debe tener exactamente 4 digitos' })
  @Matches(/^\d{4}$/, { message: 'cardLast4 debe contener solo digitos' })
  cardLast4?: string;
}
