import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AgencyPermissionGuard } from './agency-permission.guard.js';
import { AgencyPermissionsService } from './agency-permissions.service.js';
import { CaslAbilityFactory } from './casl-ability.factory.js';
import { PermissionGuard } from './permission.guard.js';
import { PlatformPermissionsService } from './platform-permissions.service.js';

@Module({
  imports: [PrismaModule],
  providers: [
    CaslAbilityFactory,
    PlatformPermissionsService,
    PermissionGuard,
    AgencyPermissionsService,
    AgencyPermissionGuard,
  ],
  exports: [
    CaslAbilityFactory,
    PlatformPermissionsService,
    PermissionGuard,
    AgencyPermissionsService,
    AgencyPermissionGuard,
  ],
})
export class AuthorizationModule {}