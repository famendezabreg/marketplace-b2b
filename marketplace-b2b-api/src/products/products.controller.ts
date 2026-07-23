import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Crear un producto con rangos de precio por volumen',
    description:
      'Solo proveedor. Los rangos de precio no pueden solaparse (se valida al crear).',
  })
  @ApiResponse({ status: 201, description: 'Producto creado con sus rangos de precio.' })
  @ApiResponse({ status: 400, description: 'Rangos de precio invalidos o solapados.' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('providerId') providerId: string,
  ) {
    return this.productsService.create(dto, providerId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos (catalogo)' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Filtrar por proveedor' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por activos/inactivos' })
  @ApiResponse({ status: 200, description: 'Lista de productos.' })
  findAll(
    @Query('providerId') providerId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.productsService.findAll({
      providerId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiResponse({ status: 200, description: 'Datos del producto.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Actualizar mi producto',
    description: 'Control de acceso a nivel de recurso: solo el proveedor dueno puede editarlo.',
  })
  @ApiResponse({ status: 200, description: 'Producto actualizado.' })
  @ApiResponse({ status: 403, description: 'Intento de editar el producto de otro proveedor.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('providerId') providerId: string,
  ) {
    return this.productsService.update(id, dto, providerId);
  }

  @Delete(':id')
  @Roles(UserRole.PROVEEDOR)
  @ApiOperation({
    summary: 'Eliminar mi producto',
    description: 'Control de acceso a nivel de recurso: solo el proveedor dueno puede eliminarlo.',
  })
  @ApiResponse({ status: 200, description: 'Producto eliminado.' })
  @ApiResponse({ status: 403, description: 'Intento de eliminar el producto de otro proveedor.' })
  remove(
    @Param('id') id: string,
    @CurrentUser('providerId') providerId: string,
  ) {
    return this.productsService.remove(id, providerId);
  }
}
