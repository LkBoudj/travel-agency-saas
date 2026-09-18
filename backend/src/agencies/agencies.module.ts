import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AgenciesController } from './agencies.controller.js';
import { AgenciesService } from './agencies.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [AgenciesController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
