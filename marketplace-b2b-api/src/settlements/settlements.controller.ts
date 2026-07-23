import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private settlementsService: SettlementsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generar una liquidacion para un proveedor y periodo',
    description:
      'Solo admin. Incluye las ordenes en estado "recibida" del periodo que no hayan sido liquidadas antes (evita pagar doble). Calcula ventas - comision = monto a pagar.',
  })
  @ApiResponse({ status: 201, description: 'Liquidacion generada, estado "pendiente".' })
  @ApiResponse({ status: 400, description: 'No hay ordenes elegibles para liquidar en el periodo.' })
  @ApiResponse({ status: 403, description: 'Solo admin puede generar liquidaciones.' })
  create(@Body() dto: CreateSettlementDto) {
    return this.settlementsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar liquidaciones',
    description: 'Un proveedor solo ve las suyas; admin puede filtrar por proveedor o ver todas.',
  })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de liquidaciones.' })
  findAll(
    @CurrentUser() user: { role: string; providerId?: string },
    @Query('providerId') providerId?: string,
  ) {
    // Un proveedor solo puede ver sus propias liquidaciones
    const effectiveProviderId =
      user.role === UserRole.PROVEEDOR ? user.providerId : providerId;
    return this.settlementsService.findAll(effectiveProviderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una liquidacion por ID' })
  @ApiResponse({ status: 200, description: 'Datos de la liquidacion, incluye ordenes incluidas.' })
  @ApiResponse({ status: 403, description: 'La liquidacion pertenece a otro proveedor.' })
  @ApiResponse({ status: 404, description: 'Liquidacion no encontrada.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { role: string; providerId?: string },
  ) {
    return this.settlementsService.findOne(id, user);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Marcar una liquidacion como pagada (solo admin)' })
  @ApiResponse({ status: 200, description: 'Liquidacion actualizada a estado "pagada".' })
  @ApiResponse({ status: 403, description: 'Solo admin puede marcar liquidaciones como pagadas.' })
  @ApiResponse({ status: 404, description: 'Liquidacion no encontrada.' })
  markAsPaid(@Param('id') id: string) {
    return this.settlementsService.markAsPaid(id);
  }
}
