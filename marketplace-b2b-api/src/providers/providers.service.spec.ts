import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { Provider } from './entities/provider.entity';
import { User } from '../users/entities/user.entity';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let providersRepository: any;
  let usersRepository: any;

  beforeEach(async () => {
    providersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    usersRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: getRepositoryToken(Provider), useValue: providersRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('lanza NotFoundException si el proveedor no existe', async () => {
    providersRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('impide que un proveedor edite el perfil de otro proveedor', async () => {
    providersRepository.findOne.mockResolvedValue({ id: 'provider-A' });
    await expect(
      service.update('provider-A', { companyName: 'X' }, 'provider-B'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite que el proveedor edite su propio perfil', async () => {
    providersRepository.findOne.mockResolvedValue({ id: 'provider-A' });
    const result = await service.update(
      'provider-A',
      { companyName: 'Nuevo nombre' },
      'provider-A',
    );
    expect(result.companyName).toBe('Nuevo nombre');
  });

  describe('remove (soft delete)', () => {
    it('impide que un proveedor desactive el perfil de otro proveedor', async () => {
      providersRepository.findOne.mockResolvedValue({
        id: 'provider-A',
        userId: 'user-A',
      });
      await expect(
        service.remove('provider-A', 'provider-B'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('desactiva el usuario asociado al eliminar el propio perfil', async () => {
      providersRepository.findOne.mockResolvedValue({
        id: 'provider-A',
        userId: 'user-A',
      });
      const result = await service.remove('provider-A', 'provider-A');
      expect(usersRepository.update).toHaveBeenCalledWith('user-A', {
        isActive: false,
      });
      expect(result).toEqual({ deactivated: true });
    });
  });

  describe('setActiveStatus (admin)', () => {
    it('desactiva la cuenta de cualquier proveedor sin validar dueno del recurso', async () => {
      providersRepository.findOne.mockResolvedValue({
        id: 'provider-A',
        userId: 'user-A',
      });
      const result = await service.setActiveStatus('provider-A', false);
      expect(usersRepository.update).toHaveBeenCalledWith('user-A', {
        isActive: false,
      });
      expect(result).toEqual({ id: 'provider-A', isActive: false });
    });

    it('reactiva la cuenta de un proveedor previamente desactivado', async () => {
      providersRepository.findOne.mockResolvedValue({
        id: 'provider-A',
        userId: 'user-A',
      });
      const result = await service.setActiveStatus('provider-A', true);
      expect(usersRepository.update).toHaveBeenCalledWith('user-A', {
        isActive: true,
      });
      expect(result).toEqual({ id: 'provider-A', isActive: true });
    });
  });
});
