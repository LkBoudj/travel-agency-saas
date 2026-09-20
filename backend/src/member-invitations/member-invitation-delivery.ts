import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * What the delivery layer needs about an invitation to reach its recipient.
 *
 * The plaintext `token` flows from create() to the delivery provider and
 * nowhere else. It exists here on purpose: this is the seam where a real email
 * provider (Resend/SendGrid/SMTP) will be attached.
 */
export interface MemberInvitationDelivery {
  inviteeEmail: string;
  agencyName: string;
  agencyCode: string;
  token: string;
  expiresAt: Date;
}

/**
 * Delivery boundary for invitation links.
 *
 * No email infrastructure exists in this repository, and none may be invented.
 * `MEMBER_INVITE_DELIVERY` selects the provider:
 *
 *   - `none` (default): the invitation persists but is never delivered. This is
 *     honest: no emails leave this system, and no fake "sent" state is created.
 *   - `dev`: prints the accept link to the application log. DELIBERATELY
 *     refused in production (NODE_ENV=production) because the link embeds the
 *     plaintext token; in production only a real provider may hold it.
 *
 * Because delivery is genuinely async and out-of-band, tests obtain plaintext
 * tokens by overriding this provider with a capture spy — never from an API
 * response.
 */
@Injectable()
export class MemberInvitationDeliveryService {
  private readonly logger = new Logger(MemberInvitationDeliveryService.name);

  constructor(private readonly config: ConfigService) {}

  async deliver(invitation: MemberInvitationDelivery): Promise<void> {
    const mode = this.config.get<string>('MEMBER_INVITE_DELIVERY', 'none').toLowerCase();

    if (mode === 'dev') {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.warn(
          'member-invitations: MEMBER_INVITE_DELIVERY=dev is set in production; the invitation ' +
            'link was NOT logged. Configure a real delivery provider instead.',
        );
        return;
      }
      this.logger.log(
        `[dev] member invitation for ${invitation.inviteeEmail} → ` +
          `${invitation.agencyName} (${invitation.agencyCode}), expires ` +
          `${invitation.expiresAt.toISOString()}: ` +
          `/v1/member-invitations/${invitation.token}/accept`,
      );
      return;
    }

    // `none`: the invitation row is real and pending, but nothing was sent.
    // A frontline that cannot yet email must not pretend it did.
  }
}