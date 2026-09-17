import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CaslAbilityFactory } from './casl-ability.factory.js';
import { PermissionGuard } from './permission.guard.js';
import { PlatformPermissionsService } from './platform-permissions.service.js';

@Module({
  imports: [PrismaModule],
  providers: [CaslAbilityFactory, PlatformPermissionsService, PermissionGuard],
  exports: [CaslAbilityFactory, PlatformPermissionsService, PermissionGuard],
})
export class AuthorizationModule {}