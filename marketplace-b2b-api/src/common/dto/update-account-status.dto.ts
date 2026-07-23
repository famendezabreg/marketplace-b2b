import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAccountStatusDto {
  @ApiProperty({
    description: 'true para activar la cuenta, false para desactivarla',
    example: false,
  })
  @IsBoolean()
  isActive: boolean;
}
