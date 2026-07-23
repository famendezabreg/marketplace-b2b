import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'proveedor@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ClaveSegura123' })
  @IsString()
  @MinLength(8)
  password: string;
}
