import { apiRequest } from '../../../services/api.ts';
import {
  buildMemberSearchQuery,
  buildMemberStatusPayload,
  buildRolesPayload,
} from '../lib/member-payloads.ts';
import type { AgencyMember, AssignableAgencyRole } from '../types.ts';

export function requestAgencyMembers(agencyCode: string, search = ''): Promise<AgencyMember[]> {
  return apiRequest<AgencyMember[]>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/members${buildMemberSearchQuery(search)}`
  );
}

export function requestAvailableRoles(agencyCode: string): Promise<AssignableAgencyRole[]> {
  return apiRequest<AssignableAgencyRole[]>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/available-roles`
  );
}

export function requestReplaceMemberRoles(
  agencyCode: string,
  userCode: string,
  roleKeys: string[]
): Promise<AgencyMember> {
  return apiRequest<AgencyMember>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/members/${encodeURIComponent(userCode)}/roles`,
    { method: 'PUT', body: JSON.stringify(buildRolesPayload(roleKeys)) }
  );
}

export function requestSetMemberStatus(
  agencyCode: string,
  userCode: string,
  status: 'ACTIVE' | 'SUSPENDED'
): Promise<AgencyMember> {
  return apiRequest<AgencyMember>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/members/${encodeURIComponent(userCode)}/status`,
    { method: 'PATCH', body: JSON.stringify(buildMemberStatusPayload(status)) }
  );
}

export function requestRemoveMember(agencyCode: string, userCode: string): Promise<void> {
  return apiRequest<void>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/members/${encodeURIComponent(userCode)}`,
    { method: 'DELETE' }
  );
}
