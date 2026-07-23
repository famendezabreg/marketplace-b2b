import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommissionCategoriesService } from './commission-categories.service';
import { CommissionCategory } from './entities/commission-category.entity';

describe('CommissionCategoriesService', () => {
  let service: CommissionCategoriesService;
  let categoriesRepository: any;

  beforeEach(async () => {
    categoriesRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'cat-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionCategoriesService,
        {
          provide: getRepositoryToken(CommissionCategory),
          useValue: categoriesRepository,
        },
      ],
    }).compile();

    service = module.get<CommissionCategoriesService>(
      CommissionCategoriesService,
    );
  });

  it('crea una categoria de comision', async () => {
    const result = await service.create({
      name: 'Electronica',
      commissionPercentage: 8.5,
    });
    expect(result.name).toBe('Electronica');
  });

  it('rechaza crear una categoria con nombre duplicado (409, no 500 crudo)', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'cat-existing',
      name: 'Electronica',
    });
    await expect(
      service.create({ name: 'Electronica', commissionPercentage: 5 }),
    ).rejects.toThrow(ConflictException);
  });

  it('lanza NotFoundException si la categoria no existe', async () => {
    categoriesRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualiza una categoria existente', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'cat-1',
      name: 'Electronica',
      commissionPercentage: 8.5,
    });
    const result = await service.update('cat-1', { commissionPercentage: 10 });
    expect(result.commissionPercentage).toBe(10);
  });

  it('rechaza renombrar una categoria a un nombre ya usado por otra', async () => {
    categoriesRepository.findOne
      .mockResolvedValueOnce({ id: 'cat-1', name: 'Electronica' }) // findOne(id)
      .mockResolvedValueOnce({ id: 'cat-2', name: 'Ferreteria' }); // chequeo de duplicado
    await expect(
      service.update('cat-1', { name: 'Ferreteria' }),
    ).rejects.toThrow(ConflictException);
  });

  it('elimina una categoria existente', async () => {
    categoriesRepository.findOne.mockResolvedValue({ id: 'cat-1' });
    const result = await service.remove('cat-1');
    expect(result).toEqual({ deleted: true });
    expect(categoriesRepository.remove).toHaveBeenCalled();
  });
});
