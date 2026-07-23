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
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrderStatus } from '../common/enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar mis ordenes',
    description: 'Comprador ve las suyas, proveedor ve las suyas, admin ve todas.',
  })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiResponse({ status: 200, description: 'Lista de ordenes visibles para el rol actual.' })
  findAll(
    @CurrentUser()
    user: { role: string; buyerId?: string; providerId?: string },
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll({
      buyerId: user.role === UserRole.COMPRADOR ? user.buyerId : undefined,
      providerId: user.role === UserRole.PROVEEDOR ? user.providerId : undefined,
      status,
    });
  }

  @Post('checkout')
  @Roles(UserRole.COMPRADOR)
  @ApiOperation({
    summary: 'Checkout del carrito de compras',
    description:
      'Compra directa (sin negociacion de precio via cotizacion): puede incluir productos de varios proveedores. Genera una orden normal por producto, usando el precio del rango de volumen correspondiente. Todo o nada -- si el stock de cualquier producto no alcanza, no se crea ninguna orden.',
  })
  @ApiResponse({ status: 201, description: 'Ordenes creadas (una por producto del carrito).' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente o producto inactivo.' })
  checkout(
    @Body() dto: CheckoutCartDto,
    @CurrentUser('buyerId') buyerId: string,
  ) {
    return this.ordersService.checkoutCart(buyerId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una orden por ID',
    description: 'Solo el comprador o proveedor involucrados (o un admin) pueden verla.',
  })
  @ApiResponse({ status: 200, description: 'Datos de la orden, incluye historial de estados.' })
  @ApiResponse({ status: 403, description: 'La orden no pertenece al usuario autenticado.' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser()
    user: { role: string; buyerId?: string; providerId?: string },
  ) {
    return this.ordersService.findOneForRequester(id, user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar el estado de una orden',
    description:
      'El comprador solo puede cancelar; proveedor/admin pueden avanzar el resto de estados. Valida transiciones permitidas (creada -> confirmada -> en_preparacion -> despachada -> recibida, o cancelada).',
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado, efectos de stock aplicados.' })
  @ApiResponse({ status: 400, description: 'Transicion de estado invalida.' })
  @ApiResponse({ status: 403, description: 'Sin permiso para modificar esta orden/estado.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser()
    user: { id: string; role: string; buyerId?: string; providerId?: string },
  ) {
    return this.ordersService.updateStatus(id, dto, user);
  }
}
