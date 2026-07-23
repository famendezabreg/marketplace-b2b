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
import { BuyersService } from './buyers.service';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { UpdateAccountStatusDto } from '../common/dto/update-account-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('buyers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buyers')
export class BuyersController {
  constructor(private buyersService: BuyersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Listar todos los compradores',
    description: 'Solo admin y proveedor pueden ver el directorio completo de compradores.',
  })
  @ApiResponse({ status: 200, description: 'Lista de compradores.' })
  @ApiResponse({ status: 403, description: 'Rol sin permiso para listar compradores.' })
  findAll() {
    return this.buyersService.findAll();
  }

  /**
   * Perfil propio: cualquier comprador autenticado puede consultar su propio registro,
   * sin necesitar el permiso de listar TODOS los compradores (que es solo para
   * admin/proveedor). Debe declararse antes de ':id'.
   */
  @Get('me')
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({ summary: 'Obtener mi propio perfil de comprador' })
  @ApiResponse({ status: 200, description: 'Perfil del comprador autenticado.' })
  @ApiResponse({ status: 403, description: 'El usuario autenticado no tiene rol comprador.' })
  findMe(@CurrentUser('id') userId: string) {
    return this.buyersService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un comprador por ID' })
  @ApiResponse({ status: 200, description: 'Datos del comprador.' })
  @ApiResponse({ status: 404, description: 'Comprador no encontrado.' })
  findOne(@Param('id') id: string) {
    return this.buyersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Actualizar mi perfil de comprador',
    description: 'Control de acceso a nivel de recurso: solo el dueno del perfil puede editarlo.',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.' })
  @ApiResponse({ status: 403, description: 'Intento de editar el perfil de otro comprador.' })
  @ApiResponse({ status: 404, description: 'Comprador no encontrado.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBuyerDto,
    @CurrentUser('buyerId') buyerId: string,
  ) {
    return this.buyersService.update(id, dto, buyerId);
  }

  @Delete(':id')
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Desactivar mi cuenta de comprador',
    description:
      'Soft delete: desactiva el usuario asociado (no borra el registro, para preservar el historial de cotizaciones/ordenes).',
  })
  @ApiResponse({ status: 200, description: 'Cuenta desactivada.' })
  @ApiResponse({ status: 403, description: 'Intento de desactivar el perfil de otro comprador.' })
  remove(@Param('id') id: string, @CurrentUser('buyerId') buyerId: string) {
    return this.buyersService.remove(id, buyerId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Activar o desactivar la cuenta de un comprador (admin)',
    description:
      'Exclusivo para admin. A diferencia de DELETE :id (auto-desactivacion del propio comprador), este endpoint permite gestionar la cuenta de cualquier comprador y tambien reactivarla.',
  })
  @ApiResponse({ status: 200, description: 'Estado de la cuenta actualizado.' })
  @ApiResponse({ status: 404, description: 'Comprador no encontrado.' })
  setStatus(@Param('id') id: string, @Body() dto: UpdateAccountStatusDto) {
    return this.buyersService.setActiveStatus(id, dto.isActive);
  }
}
