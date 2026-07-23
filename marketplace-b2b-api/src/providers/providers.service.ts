import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private providersRepository: Repository<Provider>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.providersRepository.find();
  }

  async findOne(id: string) {
    const provider = await this.providersRepository.findOne({
      where: { id },
    });
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return provider;
  }

  findByUserId(userId: string) {
    return this.providersRepository.findOne({ where: { userId } });
  }

  async update(
    id: string,
    dto: UpdateProviderDto,
    requesterProviderId: string,
  ) {
    const provider = await this.findOne(id);

    // Control de acceso a nivel de recurso: un proveedor solo puede editar su propio perfil
    if (provider.id !== requesterProviderId) {
      throw new ForbiddenException('No puedes editar el perfil de otro proveedor');
    }

    Object.assign(provider, dto);
    return this.providersRepository.save(provider);
  }

  /**
   * "Eliminar" un proveedor se implementa como desactivacion de cuenta (soft delete),
   * no como borrado fisico: un proveedor puede tener ordenes historicas asociadas
   * (Order.providerId no tiene cascada), y borrarlo de verdad rompería esa integridad
   * referencial. Desactivar el usuario le impide iniciar sesion y operar, sin perder
   * el historial de productos/ordenes ya generado.
   */
  async remove(id: string, requesterProviderId: string) {
    const provider = await this.findOne(id);

    if (provider.id !== requesterProviderId) {
      throw new ForbiddenException(
        'No puedes eliminar el perfil de otro proveedor',
      );
    }

    await this.usersRepository.update(provider.userId, { isActive: false });
    return { deactivated: true };
  }

  /**
   * Activar/desactivar la cuenta de CUALQUIER proveedor -- a diferencia de remove()
   * (que es la auto-desactivacion del propio proveedor), este metodo es exclusivo
   * para el admin y no valida "dueno del recurso", ya que el admin por definicion
   * gestiona cuentas que no son la suya. Tambien permite reactivar, algo que remove()
   * no ofrecia (antes no habia forma de revertir una desactivacion).
   */
  async setActiveStatus(id: string, isActive: boolean) {
    const provider = await this.findOne(id);
    await this.usersRepository.update(provider.userId, { isActive });
    return { id: provider.id, isActive };
  }
}
