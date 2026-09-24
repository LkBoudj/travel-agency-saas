import { apiRequest } from '../../../services/api.ts';
import { buildDeparturePayload, buildDepartureUpdatePayload } from '../lib/departure-payloads.ts';
import type { DepartureFormValues } from '../schemas/departure.schema.ts';
import type { Departure, DepartureStatus } from '../types.ts';

function departuresPath(agencyCode: string, tourCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}/tours/${encodeURIComponent(tourCode)}/departures`;
}

/** Lists the departures of one tour, optionally filtered by status. */
export function requestDepartures(
  agencyCode: string,
  tourCode: string,
  status?: DepartureStatus
): Promise<Departure[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<Departure[]>(`${departuresPath(agencyCode, tourCode)}${query}`);
}

/** Reads one departure by code; cancelled departures remain readable. */
export function requestDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): Promise<Departure> {
  return apiRequest<Departure>(
    `${departuresPath(agencyCode, tourCode)}/${encodeURIComponent(departureCode)}`
  );
}

/** Creates an OPEN departure — the backend fixes the status on the wire. */
export function requestCreateDeparture(
  agencyCode: string,
  tourCode: string,
  values: DepartureFormValues
): Promise<Departure> {
  return apiRequest<Departure>(departuresPath(agencyCode, tourCode), {
    method: 'POST',
    body: JSON.stringify(buildDeparturePayload(values)),
  });
}

/** Replaces the operational fields and (optionally) moves the status. */
export function requestUpdateDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string,
  values: DepartureFormValues,
  status: DepartureStatus
): Promise<Departure> {
  return apiRequest<Departure>(
    `${departuresPath(agencyCode, tourCode)}/${encodeURIComponent(departureCode)}`,
    { method: 'PUT', body: JSON.stringify(buildDepartureUpdatePayload(values, status)) }
  );
}

/**
 * One-way soft-action: OPEN/CLOSED → CANCELLED. There is no restore. The tour
 * status is never touched — cancelling the last open departure keeps the tour
 * exactly where it is (the UI surfaces a warning instead).
 */
export function requestCancelDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): Promise<Departure> {
  return apiRequest<Departure>(
    `${departuresPath(agencyCode, tourCode)}/${encodeURIComponent(departureCode)}/cancel`,
    { method: 'POST' }
  );
}
