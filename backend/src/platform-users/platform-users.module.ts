import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PlatformUsersController } from './platform-users.controller.js';
import { PlatformUsersService } from './platform-users.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [PlatformUsersController],
  providers: [PlatformUsersService],
})
export class PlatformUsersModule {}