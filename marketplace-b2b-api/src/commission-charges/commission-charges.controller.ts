import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommissionChargesService } from './commission-charges.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('commission-charges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commission-charges')
export class CommissionChargesController {
  constructor(private commissionChargesService: CommissionChargesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Listar comisiones por cobrar (pagos en efectivo contra entrega)',
    description:
      'Un proveedor solo ve lo que el debe; admin ve todo o puede filtrar por proveedor.',
  })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de cobros de comision.' })
  findAll(
    @CurrentUser() user: { role: string; providerId?: string },
    @Query('providerId') providerId?: string,
  ) {
    const effectiveProviderId =
      user.role === UserRole.PROVEEDOR ? user.providerId : providerId;
    return this.commissionChargesService.findAll({ providerId: effectiveProviderId });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVEEDOR)
  @ApiOperation({ summary: 'Obtener un cobro de comision por ID' })
  @ApiResponse({ status: 200, description: 'Datos del cobro de comision.' })
  @ApiResponse({ status: 403, description: 'El cobro pertenece a otro proveedor.' })
  @ApiResponse({ status: 404, description: 'Cobro no encontrado.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { role: string; providerId?: string },
  ) {
    return this.commissionChargesService.findOne(id, user);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Confirmar que el proveedor ya transfirio la comision (solo admin)',
    description:
      'Pago simulado: no hay transferencia real, solo se marca que la plataforma ya recibio ese dinero del proveedor.',
  })
  @ApiResponse({ status: 200, description: 'Cobro actualizado a estado "pagada".' })
  @ApiResponse({ status: 403, description: 'Solo admin puede confirmar el cobro.' })
  @ApiResponse({ status: 404, description: 'Cobro no encontrado.' })
  markAsPaid(@Param('id') id: string) {
    return this.commissionChargesService.markAsPaid(id);
  }
}
