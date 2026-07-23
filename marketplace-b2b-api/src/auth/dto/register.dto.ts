import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'proveedor@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ClaveSegura123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PROVEEDOR })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'Distribuidora ACME S.A.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '0614-123456-001-2', required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ example: '+503 7000-0000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}
