import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Buyer } from './entities/buyer.entity';
import { User } from '../users/entities/user.entity';
import { UpdateBuyerDto } from './dto/update-buyer.dto';

@Injectable()
export class BuyersService {
  constructor(
    @InjectRepository(Buyer) private buyersRepository: Repository<Buyer>,
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.buyersRepository.find();
  }

  async findOne(id: string) {
    const buyer = await this.buyersRepository.findOne({ where: { id } });
    if (!buyer) {
      throw new NotFoundException('Comprador no encontrado');
    }
    return buyer;
  }

  findByUserId(userId: string) {
    return this.buyersRepository.findOne({ where: { userId } });
  }

  async update(id: string, dto: UpdateBuyerDto, requesterBuyerId: string) {
    const buyer = await this.findOne(id);

    if (buyer.id !== requesterBuyerId) {
      throw new ForbiddenException('No puedes editar el perfil de otro comprador');
    }

    Object.assign(buyer, dto);
    return this.buyersRepository.save(buyer);
  }

  /**
   * Igual que en ProvidersService: se desactiva la cuenta (soft delete) en vez de
   * borrar el registro, porque el comprador puede tener ordenes historicas asociadas.
   */
  async remove(id: string, requesterBuyerId: string) {
    const buyer = await this.findOne(id);

    if (buyer.id !== requesterBuyerId) {
      throw new ForbiddenException(
        'No puedes eliminar el perfil de otro comprador',
      );
    }

    await this.usersRepository.update(buyer.userId, { isActive: false });
    return { deactivated: true };
  }

  /**
   * Activar/desactivar la cuenta de CUALQUIER comprador -- exclusivo para admin,
   * no valida "dueno del recurso" (ver nota equivalente en ProvidersService).
   */
  async setActiveStatus(id: string, isActive: boolean) {
    const buyer = await this.findOne(id);
    await this.usersRepository.update(buyer.userId, { isActive });
    return { id: buyer.id, isActive };
  }
}
