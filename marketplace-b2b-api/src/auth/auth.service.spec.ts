import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Buyer } from '../buyers/entities/buyer.entity';
import { UserRole } from '../common/enums/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let providersRepository: any;
  let buyersRepository: any;

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'user-1', ...entity })),
    };
    providersRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    buyersRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Provider), useValue: providersRepository },
        { provide: getRepositoryToken(Buyer), useValue: buyersRepository },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('fake-jwt-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('rechaza el registro si el correo ya existe', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({
          email: 'ya@existe.com',
          password: 'password123',
          role: UserRole.PROVEEDOR,
          companyName: 'ACME',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('crea el perfil de proveedor al registrar con rol PROVEEDOR', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.register({
        email: 'nuevo@proveedor.com',
        password: 'password123',
        role: UserRole.PROVEEDOR,
        companyName: 'ACME',
      } as any);

      expect(providersRepository.save).toHaveBeenCalled();
      expect(buyersRepository.save).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('fake-jwt-token');
    });
  });

  describe('login', () => {
    it('rechaza credenciales invalidas si el usuario no existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'no@existe.com', password: 'x' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza credenciales invalidas si la contrasena no coincide', async () => {
      const hashedPassword = await bcrypt.hash('correcta123', 10);
      usersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'user@demo.com',
        password: hashedPassword,
        isActive: true,
        role: UserRole.COMPRADOR,
      });

      await expect(
        service.login({
          email: 'user@demo.com',
          password: 'incorrecta',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('genera un token cuando las credenciales son correctas', async () => {
      const hashedPassword = await bcrypt.hash('correcta123', 10);
      usersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'user@demo.com',
        password: hashedPassword,
        isActive: true,
        role: UserRole.COMPRADOR,
      });

      const result = await service.login({
        email: 'user@demo.com',
        password: 'correcta123',
      } as any);

      expect(result.accessToken).toBe('fake-jwt-token');
    });
  });
});
