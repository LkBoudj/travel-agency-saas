import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AgencyAccessController } from './agency-access.controller.js';

/**
 * Agency-scoped surface for members of an agency.
 *
 * Deliberately separate from `AgenciesModule`, which is the PLATFORM
 * administration surface: the two answer to different authorization models and
 * must not share a controller.
 */
@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [AgencyAccessController],
})
export class AgencyAccessModule {}
