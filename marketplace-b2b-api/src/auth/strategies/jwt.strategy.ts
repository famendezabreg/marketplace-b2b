import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { Buyer } from '../../buyers/entities/buyer.entity';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Provider)
    private providersRepository: Repository<Provider>,
    @InjectRepository(Buyer) private buyersRepository: Repository<Buyer>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario invalido o inactivo');
    }

    // Se resuelve el providerId/buyerId una sola vez aqui para que los guards
    // de control de acceso a nivel de recurso no tengan que consultarlo despues.
    let providerId: string | undefined;
    let buyerId: string | undefined;

    if (user.role === 'proveedor') {
      const provider = await this.providersRepository.findOne({
        where: { userId: user.id },
      });
      providerId = provider?.id;
    }

    if (user.role === 'comprador') {
      const buyer = await this.buyersRepository.findOne({
        where: { userId: user.id },
      });
      buyerId = buyer?.id;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      providerId,
      buyerId,
    };
  }
}
