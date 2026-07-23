import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionCategory } from './entities/commission-category.entity';
import { CreateCommissionCategoryDto } from './dto/create-commission-category.dto';
import { UpdateCommissionCategoryDto } from './dto/update-commission-category.dto';

@Injectable()
export class CommissionCategoriesService {
  constructor(
    @InjectRepository(CommissionCategory)
    private categoriesRepository: Repository<CommissionCategory>,
  ) {}

  async create(dto: CreateCommissionCategoryDto) {
    const existing = await this.categoriesRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una categoria de comision con el nombre "${dto.name}"`,
      );
    }
    return this.categoriesRepository.save(
      this.categoriesRepository.create(dto),
    );
  }

  findAll() {
    return this.categoriesRepository.find();
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Categoria de comision no encontrada');
    }
    return category;
  }

  async update(id: string, dto: UpdateCommissionCategoryDto) {
    const category = await this.findOne(id);
    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoriesRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una categoria de comision con el nombre "${dto.name}"`,
        );
      }
    }
    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    await this.categoriesRepository.remove(category);
    return { deleted: true };
  }
}
