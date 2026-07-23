import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateAccountStatusDto } from '../common/dto/update-account-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Listar todos los proveedores',
    description: 'Solo admin y comprador pueden ver el directorio completo de proveedores.',
  })
  @ApiResponse({ status: 200, description: 'Lista de proveedores.' })
  @ApiResponse({ status: 403, description: 'Rol sin permiso para listar proveedores.' })
  findAll() {
    return this.providersService.findAll();
  }

  /**
   * Perfil propio: cualquier proveedor autenticado puede consultar su propio registro,
   * sin necesitar el permiso de listar TODOS los proveedores (que es solo para
   * admin/comprador). Debe declararse antes de ':id' para que 'me' no se interprete
   * como un ID.
   */
  @Get('me')
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({ summary: 'Obtener mi propio perfil de proveedor' })
  @ApiResponse({ status: 200, description: 'Perfil del proveedor autenticado.' })
  @ApiResponse({ status: 403, description: 'El usuario autenticado no tiene rol proveedor.' })
  findMe(@CurrentUser('id') userId: string) {
    return this.providersService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proveedor por ID' })
  @ApiResponse({ status: 200, description: 'Datos del proveedor.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Actualizar mi perfil de proveedor',
    description: 'Control de acceso a nivel de recurso: solo el dueno del perfil puede editarlo.',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.' })
  @ApiResponse({ status: 403, description: 'Intento de editar el perfil de otro proveedor.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser('providerId') providerId: string,
  ) {
    return this.providersService.update(id, dto, providerId);
  }

  @Delete(':id')
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Desactivar mi cuenta de proveedor',
    description:
      'Soft delete: desactiva el usuario asociado (no borra el registro, para preservar el historial de productos/ordenes).',
  })
  @ApiResponse({ status: 200, description: 'Cuenta desactivada.' })
  @ApiResponse({ status: 403, description: 'Intento de desactivar el perfil de otro proveedor.' })
  remove(
    @Param('id') id: string,
    @CurrentUser('providerId') providerId: string,
  ) {
    return this.providersService.remove(id, providerId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Activar o desactivar la cuenta de un proveedor (admin)',
    description:
      'Exclusivo para admin. A diferencia de DELETE :id (auto-desactivacion del propio proveedor), este endpoint permite gestionar la cuenta de cualquier proveedor y tambien reactivarla.',
  })
  @ApiResponse({ status: 200, description: 'Estado de la cuenta actualizado.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  setStatus(@Param('id') id: string, @Body() dto: UpdateAccountStatusDto) {
    return this.providersService.setActiveStatus(id, dto.isActive);
  }
}
