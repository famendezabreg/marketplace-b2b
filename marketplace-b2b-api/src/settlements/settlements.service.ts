import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Settlement } from './entities/settlement.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { SettlementStatus } from '../common/enums/settlement-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(Settlement)
    private settlementsRepository: Repository<Settlement>,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
  ) {}

  /**
   * Genera una liquidacion: ventas - comisiones = monto a pagar.
   * Solo incluye ordenes RECIBIDAS (completadas), pagadas con TARJETA, dentro del periodo,
   * y que no hayan sido incluidas en una liquidacion previa (evita doble pago).
   *
   * Las ordenes pagadas en efectivo contra entrega NO entran aqui: en ese flujo el
   * proveedor ya recibio el dinero completo directo del comprador, asi que no hay nada
   * que la plataforma le deba pagar. Lo que existe en ese caso es lo contrario -- el
   * proveedor le debe la comision a la plataforma -- y eso se gestiona por separado
   * en CommissionCharge (se genera automaticamente al marcar la orden "recibida").
   */
  async create(dto: CreateSettlementDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodStart > periodEnd) {
      throw new BadRequestException(
        'periodStart no puede ser posterior a periodEnd',
      );
    }

    const eligibleOrders = await this.ordersRepository.find({
      where: {
        providerId: dto.providerId,
        status: OrderStatus.RECIBIDA,
        paymentMethod: PaymentMethod.TARJETA,
        isSettled: false,
        createdAt: Between(periodStart, periodEnd),
      },
    });

    if (eligibleOrders.length === 0) {
      throw new BadRequestException(
        'No hay ordenes elegibles para liquidar en este periodo (deben estar en estado "recibida", pagadas con tarjeta, y no liquidadas previamente)',
      );
    }

    const totalSales = eligibleOrders.reduce(
      (sum, order) => sum + Number(order.netAmount),
      0,
    );
    const totalCommission = eligibleOrders.reduce(
      (sum, order) => sum + Number(order.commissionAmount),
      0,
    );
    const totalPayout = totalSales - totalCommission;

    const settlement = this.settlementsRepository.create({
      providerId: dto.providerId,
      periodStart,
      periodEnd,
      totalSales: Number(totalSales.toFixed(2)),
      totalCommission: Number(totalCommission.toFixed(2)),
      totalPayout: Number(totalPayout.toFixed(2)),
      status: SettlementStatus.PENDIENTE,
      orders: eligibleOrders,
    });

    const savedSettlement = await this.settlementsRepository.save(settlement);

    await this.ordersRepository.update(
      { id: In(eligibleOrders.map((o) => o.id)) },
      { isSettled: true },
    );

    return savedSettlement;
  }

  findAll(providerId?: string) {
    return this.settlementsRepository.find({
      where: providerId ? { providerId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    requester: { role: string; providerId?: string },
  ) {
    const settlement = await this.settlementsRepository.findOne({
      where: { id },
      relations: ['orders'],
    });

    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada');
    }

    if (
      requester.role === UserRole.PROVEEDOR &&
      settlement.providerId !== requester.providerId
    ) {
      throw new ForbiddenException(
        'No puedes ver liquidaciones de otro proveedor',
      );
    }

    return settlement;
  }

  async markAsPaid(id: string) {
    const settlement = await this.settlementsRepository.findOne({
      where: { id },
    });
    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada');
    }
    settlement.status = SettlementStatus.PAGADA;
    return this.settlementsRepository.save(settlement);
  }
}
