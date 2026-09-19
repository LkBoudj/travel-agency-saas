import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SecurityModule } from './security/security.module.js';
import { PlatformUsersModule } from './platform-users/platform-users.module.js';
import { AgencyApplicationsModule } from './agency-applications/agency-applications.module.js';
import { MeModule } from './me/me.module.js';
import { AgencyMembersModule } from './agency-members/agency-members.module.js';
import { MemberInvitationsModule } from './member-invitations/member-invitations.module.js';
import { AgencyAccessModule } from './agency-access/agency-access.module.js';
import { AgenciesModule } from './agencies/agencies.module.js';
import { RbacModule } from './rbac/rbac.module.js';

@Module({
  imports: [
    SecurityModule,
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    AuthorizationModule,
    RbacModule,
    PlatformUsersModule,
    AgencyApplicationsModule,
    AgenciesModule,
    AgencyAccessModule,
    AgencyMembersModule,
    MemberInvitationsModule,
    MeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
