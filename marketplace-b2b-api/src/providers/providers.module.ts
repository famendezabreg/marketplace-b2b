import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, User])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
