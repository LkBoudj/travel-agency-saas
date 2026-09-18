import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PlatformUsersModule } from './platform-users/platform-users.module.js';
import { AgencyApplicationsModule } from './agency-applications/agency-applications.module.js';
import { AgenciesModule } from './agencies/agencies.module.js';
import { RbacModule } from './rbac/rbac.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    AuthorizationModule,
    RbacModule,
    PlatformUsersModule,
    AgencyApplicationsModule,
    AgenciesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
