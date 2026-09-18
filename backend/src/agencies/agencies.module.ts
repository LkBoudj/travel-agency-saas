import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AgenciesController } from './agencies.controller.js';
import { AgenciesService } from './agencies.service.js';
import { AgencyProvisioningService } from './agency-provisioning.service.js';
import { AppUserLookupController } from './app-user-lookup.controller.js';
import { AppUserLookupService } from './app-user-lookup.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [AgenciesController, AppUserLookupController],
  providers: [AgenciesService, AgencyProvisioningService, AppUserLookupService],
  exports: [AgenciesService, AgencyProvisioningService],
})
export class AgenciesModule {}
