import { apiRequest } from '../../../services/api.ts';
import { buildInvitationPayload, buildInvitationStatusQuery } from '../lib/member-payloads.ts';
import type { MemberInvitation, MemberInvitationStatus } from '../types.ts';

export function requestCreateMemberInvitation(
  agencyCode: string,
  email: string,
  roleKeys: string[]
): Promise<MemberInvitation> {
  return apiRequest<MemberInvitation>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/member-invitations`,
    { method: 'POST', body: JSON.stringify(buildInvitationPayload(email, roleKeys)) }
  );
}

export function requestMemberInvitations(
  agencyCode: string,
  status?: MemberInvitationStatus
): Promise<MemberInvitation[]> {
  return apiRequest<MemberInvitation[]>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/member-invitations${buildInvitationStatusQuery(status)}`
  );
}

export function requestRevokeMemberInvitation(
  agencyCode: string,
  invitationCode: string
): Promise<void> {
  return apiRequest<void>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/member-invitations/${encodeURIComponent(invitationCode)}`,
    { method: 'DELETE' }
  );
}
