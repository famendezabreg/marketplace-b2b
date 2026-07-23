import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from './entities/claim.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ResolveClaimDto } from './dto/resolve-claim.dto';
import { ClaimStatus } from '../common/enums/claim-status.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

// Codigo de error de Postgres para violacion de restriccion unica (unique_violation)
const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim) private claimsRepository: Repository<Claim>,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
  ) {}

  /**
   * Solo el comprador dueno de la orden puede reclamar, y solo si ya la recibio
   * (no tiene sentido reclamar "llego mal" sobre algo que no ha llegado). Un solo
   * reclamo por orden (constraint unica sobre orderId).
   */
  async create(buyerId: string, dto: CreateClaimDto) {
    const order = await this.ordersRepository.findOne({ where: { id: dto.orderId } });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('No puedes reclamar una orden que no es tuya');
    }
    if (order.status !== OrderStatus.RECIBIDA) {
      throw new BadRequestException(
        `Solo se puede reclamar una orden ya recibida (estado actual: "${order.status}")`,
      );
    }

    try {
      const claim = this.claimsRepository.create({
        orderId: order.id,
        buyerId: order.buyerId,
        providerId: order.providerId,
        reason: dto.reason,
        evidenceUrls: dto.evidenceUrls,
        status: ClaimStatus.PENDIENTE,
      });
      return await this.claimsRepository.save(claim);
    } catch (err) {
      if (err?.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException('Ya existe un reclamo para esta orden');
      }
      throw err;
    }
  }

  findAll(params: { buyerId?: string; providerId?: string; status?: ClaimStatus }) {
    return this.claimsRepository.find({
      where: {
        ...(params.buyerId ? { buyerId: params.buyerId } : {}),
        ...(params.providerId ? { providerId: params.providerId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  private assertParticipant(
    claim: Claim,
    requester: { role: string; buyerId?: string; providerId?: string },
  ) {
    if (requester.role === UserRole.ADMIN) return;
    if (requester.role === UserRole.COMPRADOR && claim.buyerId === requester.buyerId) return;
    if (requester.role === UserRole.PROVEEDOR && claim.providerId === requester.providerId)
      return;
    throw new ForbiddenException('No tienes acceso a este reclamo');
  }

  async findOneForRequester(
    id: string,
    requester: { role: string; buyerId?: string; providerId?: string },
  ) {
    const claim = await this.claimsRepository.findOne({ where: { id } });
    if (!claim) {
      throw new NotFoundException('Reclamo no encontrado');
    }
    this.assertParticipant(claim, requester);
    return claim;
  }

  /**
   * Resuelve el reclamo (proveedor dueno de la venta, o admin). Aprobar un reembolso
   * NO afecta la comision que el proveedor le debe a la plataforma -- ver nota en la
   * entidad Claim: es un asunto entre proveedor y comprador, la plataforma ya gano
   * su comision por conectarlos.
   */
  async resolve(
    id: string,
    dto: ResolveClaimDto,
    requester: { id: string; role: string; providerId?: string },
  ) {
    const claim = await this.claimsRepository.findOne({ where: { id } });
    if (!claim) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    if (
      requester.role !== UserRole.ADMIN &&
      !(requester.role === UserRole.PROVEEDOR && claim.providerId === requester.providerId)
    ) {
      throw new ForbiddenException(
        'Solo el proveedor de la venta o un admin pueden resolver este reclamo',
      );
    }

    if (claim.status !== ClaimStatus.PENDIENTE) {
      throw new BadRequestException(
        `Este reclamo ya fue resuelto (estado actual: "${claim.status}")`,
      );
    }

    if (dto.status === ClaimStatus.PENDIENTE) {
      throw new BadRequestException('No se puede resolver un reclamo dejandolo en "pendiente"');
    }

    if (dto.status === ClaimStatus.REEMBOLSO_APROBADO) {
      const order = await this.ordersRepository.findOne({ where: { id: claim.orderId } });
      const maxRefund = Number(order!.subtotal);
      const refundAmount = dto.refundAmount ?? maxRefund;
      if (refundAmount > maxRefund) {
        throw new BadRequestException(
          `El reembolso (${refundAmount}) no puede ser mayor al total de la orden (${maxRefund})`,
        );
      }
      claim.refundAmount = refundAmount;
    }

    claim.status = dto.status;
    claim.resolutionNotes = dto.resolutionNotes ?? null;
    claim.resolvedByUserId = requester.id;

    return this.claimsRepository.save(claim);
  }
}
