import type { AgencyMembershipStatus, MemberInvitationStatus } from '../types.ts';

/** The exact body the PUT /members/:userCode/roles endpoint accepts. */
export function buildRolesPayload(roleKeys: string[]): { roleKeys: string[] } {
  return { roleKeys: [...new Set(roleKeys)] };
}

/** The exact body the POST /member-invitations endpoint accepts. */
export function buildInvitationPayload(
  email: string,
  roleKeys: string[]
): {
  email: string;
  roleKeys: string[];
} {
  return { email: email.trim().toLowerCase(), roleKeys: [...new Set(roleKeys)] };
}

/** The exact body the PATCH /members/:userCode/status endpoint accepts. */
export function buildMemberStatusPayload(status: AgencyMembershipStatus): {
  status: AgencyMembershipStatus;
} {
  return { status };
}

/** Query string for the member list endpoint; empty when the search is blank. */
export function buildMemberSearchQuery(search: string): string {
  const trimmed = search.trim();
  return trimmed ? `?search=${encodeURIComponent(trimmed)}` : '';
}

/** Query string for the invitation list endpoint; empty when no filter is given. */
export function buildInvitationStatusQuery(status?: MemberInvitationStatus): string {
  return status ? `?status=${encodeURIComponent(status)}` : '';
}
