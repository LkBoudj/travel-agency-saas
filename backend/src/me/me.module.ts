import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeController } from './me.controller.js';
import { MeAgenciesService } from './me-agencies.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MeController],
  providers: [MeAgenciesService],
})
export class MeModule {}
