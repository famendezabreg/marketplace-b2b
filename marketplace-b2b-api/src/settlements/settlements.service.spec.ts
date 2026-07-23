import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { Settlement } from './entities/settlement.entity';
import { Order } from '../orders/entities/order.entity';
import { UserRole } from '../common/enums/user-role.enum';

describe('SettlementsService', () => {
  let service: SettlementsService;
  let settlementsRepository: any;
  let ordersRepository: any;

  beforeEach(async () => {
    settlementsRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'settlement-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    ordersRepository = {
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementsService,
        {
          provide: getRepositoryToken(Settlement),
          useValue: settlementsRepository,
        },
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
      ],
    }).compile();

    service = module.get<SettlementsService>(SettlementsService);
  });

  describe('create', () => {
    it('rechaza si no hay ordenes elegibles', async () => {
      ordersRepository.find.mockResolvedValue([]);
      await expect(
        service.create({
          providerId: 'provider-1',
          periodStart: '2026-06-01',
          periodEnd: '2026-06-30',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calcula ventas, comision y payout total sumando las ordenes elegibles', async () => {
      ordersRepository.find.mockResolvedValue([
        { id: 'order-1', netAmount: 1000, commissionAmount: 100 },
        { id: 'order-2', netAmount: 500, commissionAmount: 50 },
      ]);

      const result = await service.create({
        providerId: 'provider-1',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
      });

      expect(result.totalSales).toBe(1500);
      expect(result.totalCommission).toBe(150);
      expect(result.totalPayout).toBe(1350);
      expect(ordersRepository.update).toHaveBeenCalled();
    });
  });

  describe('findOne - aislamiento por proveedor', () => {
    it('impide que un proveedor vea la liquidacion de otro proveedor', async () => {
      settlementsRepository.findOne.mockResolvedValue({
        id: 'settlement-1',
        providerId: 'provider-A',
      });

      await expect(
        service.findOne('settlement-1', {
          role: UserRole.PROVEEDOR,
          providerId: 'provider-B',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite al proveedor dueño ver su propia liquidacion', async () => {
      settlementsRepository.findOne.mockResolvedValue({
        id: 'settlement-1',
        providerId: 'provider-A',
      });

      const result = await service.findOne('settlement-1', {
        role: UserRole.PROVEEDOR,
        providerId: 'provider-A',
      });
      expect(result.id).toBe('settlement-1');
    });
  });

  it('lanza NotFoundException si la liquidacion no existe', async () => {
    settlementsRepository.findOne.mockResolvedValue(null);
    await expect(
      service.findOne('missing', { role: UserRole.ADMIN }),
    ).rejects.toThrow(NotFoundException);
  });
});
