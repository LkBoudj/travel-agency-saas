import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

/** Stable event names. Add to this list rather than passing free strings. */
export const AUDIT_ACTIONS = {
  platformAppUserSearch: 'PLATFORM_APP_USER_SEARCH',
  agencyMemberRolesReplaced: 'AGENCY_MEMBER_ROLES_REPLACED',
  agencyMemberSuspended: 'AGENCY_MEMBER_SUSPENDED',
  agencyMemberReactivated: 'AGENCY_MEMBER_REACTIVATED',
  agencyMemberRemoved: 'AGENCY_MEMBER_REMOVED',
  agencyMemberInvitationCreated: 'AGENCY_MEMBER_INVITATION_CREATED',
  agencyMemberInvitationRevoked: 'AGENCY_MEMBER_INVITATION_REVOKED',
  agencyMemberInvitationAccepted: 'AGENCY_MEMBER_INVITATION_ACCEPTED',
  agencyCustomerCreated: 'AGENCY_CUSTOMER_CREATED',
  agencyCustomerUpdated: 'AGENCY_CUSTOMER_UPDATED',
  agencyCustomerArchived: 'AGENCY_CUSTOMER_ARCHIVED',
  agencyTourCreated: 'AGENCY_TOUR_CREATED',
  agencyTourUpdated: 'AGENCY_TOUR_UPDATED',
  agencyTourPublished: 'AGENCY_TOUR_PUBLISHED',
  agencyTourUnpublished: 'AGENCY_TOUR_UNPUBLISHED',
  agencyTourArchived: 'AGENCY_TOUR_ARCHIVED',
  agencyDepartureCreated: 'AGENCY_DEPARTURE_CREATED',
  agencyDepartureUpdated: 'AGENCY_DEPARTURE_UPDATED',
  agencyDepartureCancelled: 'AGENCY_DEPARTURE_CANCELLED',
  agencyPricingOptionCreated: 'AGENCY_PRICING_OPTION_CREATED',
  agencyPricingOptionUpdated: 'AGENCY_PRICING_OPTION_UPDATED',
  agencyPricingOptionDeactivated: 'AGENCY_PRICING_OPTION_DEACTIVATED',
  agencyDeparturePricesReplaced: 'AGENCY_DEPARTURE_PRICES_REPLACED',
  agencyBookingCreated: 'AGENCY_BOOKING_CREATED',
  agencyBookingConfirmed: 'AGENCY_BOOKING_CONFIRMED',
  agencyBookingCancelled: 'AGENCY_BOOKING_CANCELLED',
  agencyTravelerCreated: 'AGENCY_TRAVELER_CREATED',
  agencyTravelerUpdated: 'AGENCY_TRAVELER_UPDATED',
  agencyPermissionDenied: 'AGENCY_PERMISSION_DENIED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type AuditOutcome = 'SUCCESS' | 'DENIED' | 'FAILURE';

export interface AuditEvent {
  action: AuditAction;
  outcome: AuditOutcome;
  /** Acting AppUser's public code; omitted for an unauthenticated attempt. */
  actorCode?: string | null;
  agencyCode?: string | null;
  targetCode?: string | null;
  /** A sensitive term (e.g. a searched email). Stored only as a hash. */
  sensitiveTarget?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Writes the security audit trail.
 *
 * Auditing must never be the reason a legitimate request fails, so a write
 * failure is logged and swallowed rather than propagated. That is a deliberate
 * trade: losing an audit row is bad, but refusing a member removal because the
 * audit table is unavailable is worse, and the error is still surfaced in the
 * application log.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: event.action,
          outcome: event.outcome,
          actorCode: event.actorCode ?? null,
          agencyCode: event.agencyCode ?? null,
          targetCode: event.targetCode ?? null,
          targetHash: hashSensitive(event.sensitiveTarget),
          metadata: (event.metadata ?? undefined) as never,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit event ${event.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

/**
 * Hashes a sensitive lookup term.
 *
 * Repeated probing of the same address stays correlatable, while the audit
 * table never becomes a second copy of the directory this work exists to
 * protect. Normalized first so the same address always hashes the same way.
 */
export function hashSensitive(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}
