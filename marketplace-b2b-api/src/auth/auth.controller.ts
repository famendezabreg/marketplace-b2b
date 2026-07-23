import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo proveedor o comprador',
    description:
      'Crea el usuario y, segun el rol indicado, su perfil extendido (Provider o Buyer). Devuelve un token JWT listo para usar.',
  })
  @ApiResponse({ status: 201, description: 'Usuario y perfil creados, incluye accessToken.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos (ver detalle en el body).' })
  @ApiResponse({ status: 409, description: 'El correo ya esta registrado.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion y obtener token JWT' })
  @ApiResponse({ status: 200, description: 'Login exitoso, incluye accessToken.' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas o usuario inactivo.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
