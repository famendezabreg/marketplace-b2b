import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommissionChargesService } from './commission-charges.service';
import { CommissionCharge } from './entities/commission-charge.entity';
import { CommissionChargeStatus } from '../common/enums/commission-charge-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('CommissionChargesService', () => {
  let service: CommissionChargesService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'charge-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionChargesService,
        { provide: getRepositoryToken(CommissionCharge), useValue: repository },
      ],
    }).compile();

    service = module.get<CommissionChargesService>(CommissionChargesService);
  });

  it('crea un cobro de comision en estado pendiente', async () => {
    const result = await service.create({
      orderId: 'order-1',
      providerId: 'provider-1',
      amount: 50,
    });

    expect(result.status).toBe(CommissionChargeStatus.PENDIENTE);
    expect(result.orderId).toBe('order-1');
    expect(result.amount).toBe(50);
  });

  describe('aislamiento por proveedor', () => {
    it('impide que un proveedor vea el cobro de otro proveedor', async () => {
      repository.findOne.mockResolvedValue({
        id: 'charge-1',
        providerId: 'provider-A',
      });

      await expect(
        service.findOne('charge-1', {
          role: UserRole.PROVEEDOR,
          providerId: 'provider-B',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite al proveedor dueño ver su propio cobro', async () => {
      repository.findOne.mockResolvedValue({
        id: 'charge-1',
        providerId: 'provider-A',
      });

      const result = await service.findOne('charge-1', {
        role: UserRole.PROVEEDOR,
        providerId: 'provider-A',
      });
      expect(result.id).toBe('charge-1');
    });

    it('permite al admin ver cualquier cobro', async () => {
      repository.findOne.mockResolvedValue({
        id: 'charge-1',
        providerId: 'provider-A',
      });

      const result = await service.findOne('charge-1', { role: UserRole.ADMIN });
      expect(result.id).toBe('charge-1');
    });
  });

  it('lanza NotFoundException si el cobro no existe', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.findOne('missing', { role: UserRole.ADMIN }),
    ).rejects.toThrow(NotFoundException);
  });

  it('marca un cobro como pagado', async () => {
    repository.findOne.mockResolvedValue({
      id: 'charge-1',
      status: CommissionChargeStatus.PENDIENTE,
    });

    const result = await service.markAsPaid('charge-1');
    expect(result.status).toBe(CommissionChargeStatus.PAGADA);
  });
});
