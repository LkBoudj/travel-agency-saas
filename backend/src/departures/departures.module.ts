import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DeparturesController } from './departures.controller.js';
import { DeparturesService } from './departures.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [DeparturesController],
  providers: [DeparturesService],
})
export class DeparturesModule {}