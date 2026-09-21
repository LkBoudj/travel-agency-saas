import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TravelersController } from './travelers.controller.js';
import { TravelersService } from './travelers.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [TravelersController],
  providers: [TravelersService],
  exports: [TravelersService],
})
export class TravelersModule {}