import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommissionCategoriesService } from './commission-categories.service';
import { CreateCommissionCategoryDto } from './dto/create-commission-category.dto';
import { UpdateCommissionCategoryDto } from './dto/update-commission-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('commission-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commission-categories')
export class CommissionCategoriesController {
  constructor(private categoriesService: CommissionCategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crear una categoria de comision',
    description: 'Solo admin. El % definido aqui se copia a cada orden al momento de crearla.',
  })
  @ApiResponse({ status: 201, description: 'Categoria creada.' })
  @ApiResponse({ status: 403, description: 'Solo admin puede crear categorias.' })
  create(@Body() dto: CreateCommissionCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las categorias de comision' })
  @ApiResponse({ status: 200, description: 'Lista de categorias.' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoria de comision por ID' })
  @ApiResponse({ status: 200, description: 'Datos de la categoria.' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada.' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una categoria de comision (solo admin)' })
  @ApiResponse({ status: 200, description: 'Categoria actualizada.' })
  @ApiResponse({ status: 403, description: 'Solo admin puede editar categorias.' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada.' })
  update(@Param('id') id: string, @Body() dto: UpdateCommissionCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar una categoria de comision (solo admin)' })
  @ApiResponse({ status: 200, description: 'Categoria eliminada.' })
  @ApiResponse({ status: 403, description: 'Solo admin puede eliminar categorias.' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
