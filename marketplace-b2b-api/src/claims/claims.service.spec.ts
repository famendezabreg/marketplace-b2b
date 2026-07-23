import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { Claim } from './entities/claim.entity';
import { Order } from '../orders/entities/order.entity';
import { ClaimStatus } from '../common/enums/claim-status.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let claimsRepository: any;
  let ordersRepository: any;

  beforeEach(async () => {
    claimsRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'claim-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    ordersRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: getRepositoryToken(Claim), useValue: claimsRepository },
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
  });

  describe('create', () => {
    it('crea un reclamo en estado pendiente si la orden esta recibida y es del comprador', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        status: OrderStatus.RECIBIDA,
      });

      const claim = await service.create('buyer-1', {
        orderId: 'order-1',
        reason: 'Llego dañado, dos unidades rotas',
        evidenceUrls: ['https://ejemplo.com/foto.jpg'],
      });

      expect(claim.status).toBe(ClaimStatus.PENDIENTE);
      expect(claim.buyerId).toBe('buyer-1');
      expect(claim.providerId).toBe('provider-1');
    });

    it('rechaza reclamar una orden que no esta en estado "recibida"', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        status: OrderStatus.DESPACHADA,
      });

      await expect(
        service.create('buyer-1', {
          orderId: 'order-1',
          reason: 'Llego dañado, dos unidades rotas',
          evidenceUrls: ['https://ejemplo.com/foto.jpg'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza reclamar una orden de otro comprador', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        status: OrderStatus.RECIBIDA,
      });

      await expect(
        service.create('otro-buyer', {
          orderId: 'order-1',
          reason: 'Llego dañado, dos unidades rotas',
          evidenceUrls: ['https://ejemplo.com/foto.jpg'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('traduce un choque de la restriccion unica (reclamo duplicado) a ConflictException', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
        providerId: 'provider-1',
        status: OrderStatus.RECIBIDA,
      });
      const err: any = new Error('duplicate key');
      err.code = '23505';
      claimsRepository.save.mockRejectedValueOnce(err);

      await expect(
        service.create('buyer-1', {
          orderId: 'order-1',
          reason: 'Llego dañado, dos unidades rotas',
          evidenceUrls: ['https://ejemplo.com/foto.jpg'],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resolve', () => {
    it('permite al proveedor de la venta aprobar un reembolso por el total de la orden', async () => {
      claimsRepository.findOne.mockResolvedValue({
        id: 'claim-1',
        orderId: 'order-1',
        providerId: 'provider-1',
        status: ClaimStatus.PENDIENTE,
      });
      ordersRepository.findOne.mockResolvedValue({ id: 'order-1', subtotal: 150 });

      const result = await service.resolve(
        'claim-1',
        { status: ClaimStatus.REEMBOLSO_APROBADO },
        { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
      );

      expect(result.status).toBe(ClaimStatus.REEMBOLSO_APROBADO);
      expect(result.refundAmount).toBe(150);
      expect(result.resolvedByUserId).toBe('user-1');
    });

    it('permite un reembolso parcial si esta dentro del total de la orden', async () => {
      claimsRepository.findOne.mockResolvedValue({
        id: 'claim-1',
        orderId: 'order-1',
        providerId: 'provider-1',
        status: ClaimStatus.PENDIENTE,
      });
      ordersRepository.findOne.mockResolvedValue({ id: 'order-1', subtotal: 150 });

      const result = await service.resolve(
        'claim-1',
        { status: ClaimStatus.REEMBOLSO_APROBADO, refundAmount: 50 },
        { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
      );

      expect(result.refundAmount).toBe(50);
    });

    it('rechaza un reembolso mayor al total de la orden', async () => {
      claimsRepository.findOne.mockResolvedValue({
        id: 'claim-1',
        orderId: 'order-1',
        providerId: 'provider-1',
        status: ClaimStatus.PENDIENTE,
      });
      ordersRepository.findOne.mockResolvedValue({ id: 'order-1', subtotal: 150 });

      await expect(
        service.resolve(
          'claim-1',
          { status: ClaimStatus.REEMBOLSO_APROBADO, refundAmount: 999 },
          { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite al admin resolver el reclamo de cualquier proveedor', async () => {
      claimsRepository.findOne.mockResolvedValue({
        id: 'claim-1',
        orderId: 'order-1',
        providerId: 'provider-1',
        status: ClaimStatus.PENDIENTE,
      });

      const result = await service.resolve(
        'claim-1',
        { status: ClaimStatus.CAMBIO_APROBADO, resolutionNotes: 'Llevalo a la sucursal' },
        { id: 'admin-1', role: UserRole.ADMIN },
      );

      expect(result.status).toBe(ClaimStatus.CAMBIO_APROBADO);
    });

    it('impide que un proveedor ajeno a la venta resuelva el reclamo', async () => {
      claimsRepository.findOne.mockResolvedValue({
        id: 'claim-1',
        orderId: 'order-1',
        providerId: 'provider-1',
        status: ClaimStatus.PENDIENTE,
      });

      await expect(
        service.resolve(
          'claim-1',
          { status: ClaimStatus.RECHAZADO },
          { id: 'user-2', role: UserRole.PROVEEDOR, providerId: 'provider-2' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('impide resolver un reclamo que ya fue resuelto', async () => {
      claimsRepository.findOne.mockResolvedValue({
        id: 'claim-1',
        orderId: 'order-1',
        providerId: 'provider-1',
        status: ClaimStatus.RECHAZADO,
      });

      await expect(
        service.resolve(
          'claim-1',
          { status: ClaimStatus.REEMBOLSO_APROBADO },
          { id: 'user-1', role: UserRole.PROVEEDOR, providerId: 'provider-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el reclamo no existe', async () => {
      claimsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolve(
          'claim-x',
          { status: ClaimStatus.RECHAZADO },
          { id: 'admin-1', role: UserRole.ADMIN },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
