import type { DepartureStatus } from '../types.ts';

/**
 * Query keys.
 *
 * Departures belong to one tour, so every key sits under the tour's detail
 * slice — a mutation here refetches this tour's departures only, and never
 * touches another agency's (or another tour's) cache.
 */
export const departuresQueryKeys = {
  all: (agencyCode: string, tourCode: string) =>
    ['agency', agencyCode, 'tours', 'detail', tourCode, 'departures'] as const,
  list: (agencyCode: string, tourCode: string, status?: DepartureStatus) =>
    [...departuresQueryKeys.all(agencyCode, tourCode), 'list', status ?? 'all'] as const,
  detail: (agencyCode: string, tourCode: string, departureCode: string) =>
    [...departuresQueryKeys.all(agencyCode, tourCode), 'detail', departureCode] as const,
};
