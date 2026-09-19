import type { Prisma } from '../generated/prisma/client.js';

// Re-exported for convenience; the http shapes below use it.
export type { MemberInvitationStatus } from './member-invitations.schemas.js';

/** An AGENCY role as offered by an invitation, exposed to http surfaces. */
export interface MemberInvitationRoleRef {
  key: string;
  name: string;
}

/**
 * An invitation as the agency sees it in a list.
 *
 * `roles` are the roles OFFERED at creation time, re-filtered through the same
 * tenancy rule as member role projection so a row that somehow predates the
 * database trigger never presents a foreign role. The plaintext token and the
 * token hash are never part of any response.
 */
export interface MemberInvitationResponse {
  code: string;
  email: string;
  status: string;
  roles: MemberInvitationRoleRef[];
  expiresAt: string;
  createdAt: string;
}

/**
 * Public inspect (token holder) response.
 *
 * Minimal by design: the invitee already knows their own email and the agency
 * that invited them; the response only confirms the invitation is live and when
 * it runs out. No email, no roles, no token material, no database id.
 */
export interface MemberInvitationInspectResponse {
  agency: { code: string; name: string };
  status: string;
  expiresAt: string;
}

/**
 * Confirmation of a successful acceptance. Enough for the accepting client to
 * redirect and show the caller's new place in the agency.
 */
export interface MemberInvitationAcceptResponse {
  status: 'ACCEPTED';
  agency: { code: string; name: string };
  membershipType: 'EMPLOYEE';
  membershipStatus: 'ACTIVE';
  roles: MemberInvitationRoleRef[];
  joinedAt: string;
}

/**
 * Everything a service query needs from one invitation row, including each
 * offered role's scope/owning agency so projection can re-apply the tenancy
 * filter (same rationale as AGENCY_MEMBER_SELECT).
 */
export const MEMBER_INVITATION_SELECT = {
  id: true,
  code: true,
  email: true,
  status: true,
  tokenHash: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  agency: { select: { id: true, code: true, name: true, status: true } },
  roles: { select: { role: { select: { id: true, key: true, name: true, scope: true, agencyId: true } } } },
} as const satisfies Prisma.AgencyMemberInvitationSelect;

export type MemberInvitationRow = Prisma.AgencyMemberInvitationGetPayload<{
  select: typeof MEMBER_INVITATION_SELECT;
}>;