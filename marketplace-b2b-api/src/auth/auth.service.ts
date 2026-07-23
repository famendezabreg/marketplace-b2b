import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Buyer } from '../buyers/entities/buyer.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../common/enums/user-role.enum';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Provider)
    private providersRepository: Repository<Provider>,
    @InjectRepository(Buyer) private buyersRepository: Repository<Buyer>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      }),
    );

    // Segun el rol, se crea el perfil extendido correspondiente
    if (dto.role === UserRole.PROVEEDOR) {
      await this.providersRepository.save(
        this.providersRepository.create({
          userId: user.id,
          companyName: dto.companyName,
          taxId: dto.taxId,
          phone: dto.phone,
          address: dto.address,
        }),
      );
    } else if (dto.role === UserRole.COMPRADOR) {
      await this.buyersRepository.save(
        this.buyersRepository.create({
          userId: user.id,
          companyName: dto.companyName,
          taxId: dto.taxId,
          phone: dto.phone,
          shippingAddress: dto.address,
        }),
      );
    }

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
