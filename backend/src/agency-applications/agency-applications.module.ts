import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AgenciesModule } from '../agencies/agencies.module.js';
import {
  AdminAgencyApplicationsController,
  AgencyApplicationsController,
} from './agency-applications.controller.js';
import { AgencyApplicationsService } from './agency-applications.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule, AgenciesModule],
  controllers: [AgencyApplicationsController, AdminAgencyApplicationsController],
  providers: [AgencyApplicationsService],
  exports: [AgencyApplicationsService],
})
export class AgencyApplicationsModule {}
