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
import { QuotesService } from './quotes.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { QuoteRequestStatus } from '../common/enums/quote-status.enum';

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Solicitar una cotizacion',
    description: 'Solo comprador. Valida que haya stock disponible suficiente.',
  })
  @ApiResponse({ status: 201, description: 'Solicitud de cotizacion creada, estado "pendiente".' })
  @ApiResponse({ status: 400, description: 'Sin stock suficiente o cantidad fuera de rango.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado o inactivo.' })
  create(
    @Body() dto: CreateQuoteRequestDto,
    @CurrentUser('buyerId') buyerId: string,
  ) {
    return this.quotesService.createQuoteRequest(dto, buyerId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar mis cotizaciones',
    description:
      'Aislamiento de cotizaciones: el comprador solo ve las suyas, el proveedor solo las de sus propios productos.',
  })
  @ApiQuery({ name: 'status', required: false, enum: QuoteRequestStatus })
  @ApiResponse({ status: 200, description: 'Lista de cotizaciones visibles para el rol actual.' })
  findAll(
    @CurrentUser() user: { role: string; buyerId?: string; providerId?: string },
    @Query('status') status?: QuoteRequestStatus,
  ) {
    // Cada rol solo ve lo que le corresponde: aislamiento de cotizaciones por proveedor/comprador
    return this.quotesService.findAll({
      buyerId: user.role === UserRole.COMPRADOR ? user.buyerId : undefined,
      providerId: user.role === UserRole.PROVEEDOR ? user.providerId : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cotizacion por ID' })
  @ApiResponse({ status: 200, description: 'Datos de la cotizacion.' })
  @ApiResponse({ status: 404, description: 'Cotizacion no encontrada.' })
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Patch(':id/respond')
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Responder una cotizacion con precio',
    description:
      'Solo el proveedor dueno del producto. El precio se calcula automaticamente segun el rango de volumen; el ajuste manual se limita a +/-15%.',
  })
  @ApiResponse({ status: 200, description: 'Respuesta registrada, precio calculado o ajustado.' })
  @ApiResponse({ status: 400, description: 'Ajuste de precio fuera del margen permitido.' })
  @ApiResponse({ status: 403, description: 'La cotizacion pertenece a otro proveedor.' })
  respond(
    @Param('id') id: string,
    @Body() dto: RespondQuoteDto,
    @CurrentUser('providerId') providerId: string,
  ) {
    return this.quotesService.respond(id, dto, providerId);
  }

  @Patch(':id/accept')
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Aceptar una cotizacion respondida',
    description: 'Reserva el stock del proveedor y genera automaticamente la orden de compra.',
  })
  @ApiResponse({ status: 200, description: 'Orden generada a partir de la cotizacion aceptada.' })
  @ApiResponse({ status: 400, description: 'La cotizacion no esta en estado "respondida".' })
  @ApiResponse({ status: 403, description: 'La cotizacion pertenece a otro comprador.' })
  accept(@Param('id') id: string, @CurrentUser('buyerId') buyerId: string) {
    return this.quotesService.accept(id, buyerId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({ summary: 'Rechazar una cotizacion' })
  @ApiResponse({ status: 200, description: 'Cotizacion marcada como rechazada.' })
  @ApiResponse({ status: 403, description: 'La cotizacion pertenece a otro comprador.' })
  reject(@Param('id') id: string, @CurrentUser('buyerId') buyerId: string) {
    return this.quotesService.reject(id, buyerId);
  }
}
