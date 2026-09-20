import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AgencyMembersController } from './agency-members.controller.js';
import { AgencyMembersService } from './agency-members.service.js';

/**
 * Agency-side member administration. Separate from the PLATFORM agency surface:
 * this one answers to agency authorization, not platform authorization.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [AgencyMembersController],
  providers: [AgencyMembersService],
})
export class AgencyMembersModule {}
