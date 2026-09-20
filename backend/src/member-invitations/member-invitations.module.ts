import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MemberInvitationDeliveryService } from './member-invitation-delivery.js';
import { MemberInvitationsService } from './member-invitations.service.js';
import { AgencyMemberInvitationsController, MemberInvitationsController } from './member-invitations.controller.js';
import { OptionalJwtResolver } from './optional-auth.js';

/**
 * Consent-based member invitations.
 *
 * Two surfaces in one module: the agency-side CRUD (email -> PENDING
 * invitation) guarded by AGENCY permissions, and the public token surface
 * (inspect / accept) that the invitee uses. The delivery provider is a thin
 * boundary so a real email provider can be attached without touching the domain
 * logic.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [AgencyMemberInvitationsController, MemberInvitationsController],
  providers: [
    MemberInvitationsService,
    MemberInvitationDeliveryService,
    OptionalJwtResolver,
  ],
})
export class MemberInvitationsModule {}