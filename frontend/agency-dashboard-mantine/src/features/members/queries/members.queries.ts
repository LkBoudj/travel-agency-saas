import type { MemberInvitationStatus } from '../types.ts';

export const membersQueryKeys = {
  list: (agencyCode: string, search = '') =>
    ['agency', agencyCode, 'members', 'list', search] as const,
  availableRoles: (agencyCode: string) =>
    ['agency', agencyCode, 'members', 'available-roles'] as const,
  invitations: (agencyCode: string, status?: MemberInvitationStatus) =>
    ['agency', agencyCode, 'member-invitations', status ?? 'all'] as const,
  root: (agencyCode: string) => ['agency', agencyCode, 'members'] as const,
};
