import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BuyersService } from './buyers.service';
import { Buyer } from './entities/buyer.entity';
import { User } from '../users/entities/user.entity';

describe('BuyersService', () => {
  let service: BuyersService;
  let buyersRepository: any;
  let usersRepository: any;

  beforeEach(async () => {
    buyersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    usersRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyersService,
        { provide: getRepositoryToken(Buyer), useValue: buyersRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get<BuyersService>(BuyersService);
  });

  it('lanza NotFoundException si el comprador no existe', async () => {
    buyersRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('impide que un comprador edite el perfil de otro comprador', async () => {
    buyersRepository.findOne.mockResolvedValue({ id: 'buyer-A' });
    await expect(
      service.update('buyer-A', { companyName: 'X' }, 'buyer-B'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite que el comprador edite su propio perfil', async () => {
    buyersRepository.findOne.mockResolvedValue({ id: 'buyer-A' });
    const result = await service.update(
      'buyer-A',
      { companyName: 'Nuevo nombre' },
      'buyer-A',
    );
    expect(result.companyName).toBe('Nuevo nombre');
  });

  describe('remove (soft delete)', () => {
    it('impide que un comprador desactive el perfil de otro comprador', async () => {
      buyersRepository.findOne.mockResolvedValue({
        id: 'buyer-A',
        userId: 'user-A',
      });
      await expect(service.remove('buyer-A', 'buyer-B')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('desactiva el usuario asociado al eliminar el propio perfil', async () => {
      buyersRepository.findOne.mockResolvedValue({
        id: 'buyer-A',
        userId: 'user-A',
      });
      const result = await service.remove('buyer-A', 'buyer-A');
      expect(usersRepository.update).toHaveBeenCalledWith('user-A', {
        isActive: false,
      });
      expect(result).toEqual({ deactivated: true });
    });
  });

  describe('setActiveStatus (admin)', () => {
    it('desactiva la cuenta de cualquier comprador sin validar dueno del recurso', async () => {
      buyersRepository.findOne.mockResolvedValue({
        id: 'buyer-A',
        userId: 'user-A',
      });
      const result = await service.setActiveStatus('buyer-A', false);
      expect(usersRepository.update).toHaveBeenCalledWith('user-A', {
        isActive: false,
      });
      expect(result).toEqual({ id: 'buyer-A', isActive: false });
    });

    it('reactiva la cuenta de un comprador previamente desactivado', async () => {
      buyersRepository.findOne.mockResolvedValue({
        id: 'buyer-A',
        userId: 'user-A',
      });
      const result = await service.setActiveStatus('buyer-A', true);
      expect(usersRepository.update).toHaveBeenCalledWith('user-A', {
        isActive: true,
      });
      expect(result).toEqual({ id: 'buyer-A', isActive: true });
    });
  });
});
