import { apiRequest } from '../../../services/api.ts';
import type { AgencyAccess, MyAgency } from '../types.ts';

export function requestMyAgencies(): Promise<MyAgency[]> {
  return apiRequest<MyAgency[]>('/v1/me/agencies');
}

export function requestAgencyAccess(agencyCode: string): Promise<AgencyAccess> {
  return apiRequest<AgencyAccess>(`/v1/agencies/${encodeURIComponent(agencyCode)}/me`);
}
