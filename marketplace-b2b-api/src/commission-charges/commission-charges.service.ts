import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionCharge } from './entities/commission-charge.entity';
import { CommissionChargeStatus } from '../common/enums/commission-charge-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class CommissionChargesService {
  constructor(
    @InjectRepository(CommissionCharge)
    private commissionChargesRepository: Repository<CommissionCharge>,
  ) {}

  /**
   * Invocado internamente por OrdersService cuando una orden pagada en efectivo
   * contra entrega pasa a estado "recibida" -- ver nota en la entidad.
   */
  create(params: { orderId: string; providerId: string; amount: number }) {
    const charge = this.commissionChargesRepository.create({
      orderId: params.orderId,
      providerId: params.providerId,
      amount: params.amount,
      status: CommissionChargeStatus.PENDIENTE,
    });
    return this.commissionChargesRepository.save(charge);
  }

  /**
   * El proveedor solo ve las comisiones que el debe; el admin ve todas.
   */
  findAll(params: { providerId?: string }) {
    return this.commissionChargesRepository.find({
      where: params.providerId ? { providerId: params.providerId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    requester: { role: string; providerId?: string },
  ) {
    const charge = await this.commissionChargesRepository.findOne({
      where: { id },
    });
    if (!charge) {
      throw new NotFoundException('Cobro de comision no encontrado');
    }
    if (
      requester.role === UserRole.PROVEEDOR &&
      charge.providerId !== requester.providerId
    ) {
      throw new ForbiddenException('No puedes ver el cobro de comision de otro proveedor');
    }
    return charge;
  }

  /**
   * Exclusivo admin: confirma que el proveedor ya le transfirio la comision
   * a la plataforma (pago simulado, sin transferencia real detras).
   */
  async markAsPaid(id: string) {
    const charge = await this.commissionChargesRepository.findOne({ where: { id } });
    if (!charge) {
      throw new NotFoundException('Cobro de comision no encontrado');
    }
    charge.status = CommissionChargeStatus.PAGADA;
    return this.commissionChargesRepository.save(charge);
  }
}
