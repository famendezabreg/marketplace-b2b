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
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ResolveClaimDto } from './dto/resolve-claim.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClaimStatus } from '../common/enums/claim-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private claimsService: ClaimsService) {}

  @Post()
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Reclamar una orden (producto llego mal)',
    description:
      'Solo el comprador dueno de la orden, y solo si ya esta en estado "recibida". Requiere al menos una URL de evidencia (foto). Un solo reclamo por orden.',
  })
  @ApiResponse({ status: 201, description: 'Reclamo creado en estado "pendiente".' })
  @ApiResponse({ status: 400, description: 'La orden no esta en estado "recibida".' })
  @ApiResponse({ status: 409, description: 'Ya existe un reclamo para esta orden.' })
  create(
    @Body() dto: CreateClaimDto,
    @CurrentUser('buyerId') buyerId: string,
  ) {
    return this.claimsService.create(buyerId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar reclamos',
    description: 'Comprador ve los suyos, proveedor ve los de sus ventas, admin ve todos.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ClaimStatus })
  @ApiResponse({ status: 200, description: 'Lista de reclamos visibles para el rol actual.' })
  findAll(
    @CurrentUser() user: { role: string; buyerId?: string; providerId?: string },
    @Query('status') status?: ClaimStatus,
  ) {
    return this.claimsService.findAll({
      buyerId: user.role === UserRole.COMPRADOR ? user.buyerId : undefined,
      providerId: user.role === UserRole.PROVEEDOR ? user.providerId : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un reclamo por ID' })
  @ApiResponse({ status: 200, description: 'Datos del reclamo.' })
  @ApiResponse({ status: 403, description: 'El reclamo no pertenece al usuario autenticado.' })
  @ApiResponse({ status: 404, description: 'Reclamo no encontrado.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { role: string; buyerId?: string; providerId?: string },
  ) {
    return this.claimsService.findOneForRequester(id, user);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.PROVEEDOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Resolver un reclamo (proveedor de la venta o admin)',
    description:
      'Aprobar reembolso, indicar cambio en el local del proveedor, o rechazar. Aprobar un reembolso NO afecta la comision que el proveedor le debe a la plataforma.',
  })
  @ApiResponse({ status: 200, description: 'Reclamo resuelto.' })
  @ApiResponse({ status: 400, description: 'El reclamo ya fue resuelto, o el monto de reembolso es invalido.' })
  @ApiResponse({ status: 403, description: 'Solo el proveedor de la venta o un admin pueden resolverlo.' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveClaimDto,
    @CurrentUser()
    user: { id: string; role: string; providerId?: string },
  ) {
    return this.claimsService.resolve(id, dto, user);
  }
}
