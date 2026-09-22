import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { requestAgencyAccess, requestMyAgencies } from '../api/agency-context.api.ts';
import { agencyQueryKeys } from '../queries/agency-context.queries.ts';

export function useMyAgencies() {
  return useQuery({
    queryKey: agencyQueryKeys.myAgencies(),
    queryFn: requestMyAgencies,
    staleTime: 30_000,
  });
}

export function useAgencyAccess(agencyCode: string | undefined) {
  return useQuery({
    queryKey: agencyQueryKeys.access(agencyCode ?? ''),
    queryFn: () => requestAgencyAccess(agencyCode as string),
    enabled: agencyCode !== undefined && agencyCode.length > 0,
    // Any non-2xx (suspended / not a member / not found) is handled by the
    // agency guard screen, never retried blindly.
    retry: false,
  });
}

const ACTIVE_AGENCY_STORAGE_KEY = 'agency.activeCode';

function subscribe(listener: () => void): () => void {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

function getSnapshot(): string {
  return window.localStorage.getItem(ACTIVE_AGENCY_STORAGE_KEY) ?? '';
}

export function setActiveAgencyCode(code: string): void {
  window.localStorage.setItem(ACTIVE_AGENCY_STORAGE_KEY, code);
}

export function clearActiveAgencyCode(): void {
  window.localStorage.removeItem(ACTIVE_AGENCY_STORAGE_KEY);
}

/** Current-or-nothing agency code, kept out of URL state so only one truth lives there. */
export function useActiveAgencyCode(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
