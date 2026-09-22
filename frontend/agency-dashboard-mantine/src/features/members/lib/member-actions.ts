import type { AgencyMember, AgencyMembershipStatus } from '../types.ts';

/** The agency OWNER is a membership invariant, not a row of a roles table. */
export function isOwnerMember(member: AgencyMember): boolean {
  return member.membershipType === 'OWNER';
}

export function canManageMemberRoles(member: AgencyMember): boolean {
  return !isOwnerMember(member);
}

export function canToggleMemberStatus(member: AgencyMember): boolean {
  return !isOwnerMember(member);
}

export function canRemoveMember(member: AgencyMember): boolean {
  return !isOwnerMember(member);
}

/** The status the toggle would switch to, based on the current one. */
export function nextMembershipStatus(status: AgencyMembershipStatus): AgencyMembershipStatus {
  return status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
}

/** Whether the member currently holds this role key. */
export function memberHasRole(member: AgencyMember, roleKey: string): boolean {
  return member.roles.some((role) => role.key === roleKey);
}
