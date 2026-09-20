import { apiRequest } from "@/lib/api"
import type {
  AgencyDeparture,
  DeparturePayload,
  DepartureStatus,
  DepartureUpdatePayload,
} from "../types/departure.types"

/**
 * Query keys.
 *
 * Departures belong to one tour, so every key sits under the tour's detail
 * slice — a mutation here refetches this tour's departures only, and never
 * touches another agency's (or another tour's) cache.
 */
export const departuresQueryKeys = {
  all: (agencyCode: string, tourCode: string) =>
    ["agency", agencyCode, "tours", "detail", tourCode, "departures"] as const,
  list: (
    agencyCode: string,
    tourCode: string,
    status: DepartureStatus | undefined
  ) =>
    [
      ...departuresQueryKeys.all(agencyCode, tourCode),
      "list",
      status ?? "all",
    ] as const,
  detail: (
    agencyCode: string,
    tourCode: string,
    departureCode: string
  ) =>
    [
      ...departuresQueryKeys.all(agencyCode, tourCode),
      "detail",
      departureCode,
    ] as const,
}

function base(agencyCode: string, tourCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}/tours/${encodeURIComponent(tourCode)}/departures`
}

/** Lists the departures of one tour, newest first. */
export function listDepartures(
  agencyCode: string,
  tourCode: string,
  status?: DepartureStatus
): Promise<AgencyDeparture[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ""
  return apiRequest<AgencyDeparture[]>(`${base(agencyCode, tourCode)}${query}`)
}

/** Reads one departure by code; cancelled departures remain readable. */
export function getDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): Promise<AgencyDeparture> {
  return apiRequest<AgencyDeparture>(
    `${base(agencyCode, tourCode)}/${encodeURIComponent(departureCode)}`
  )
}

/** Creates an OPEN departure — the backend never auto-publishes. */
export function createDeparture(
  agencyCode: string,
  tourCode: string,
  payload: DeparturePayload
): Promise<AgencyDeparture> {
  return apiRequest<AgencyDeparture>(base(agencyCode, tourCode), {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Replaces the operational fields and (optionally) moves the status. */
export function updateDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string,
  payload: DepartureUpdatePayload
): Promise<AgencyDeparture> {
  return apiRequest<AgencyDeparture>(
    `${base(agencyCode, tourCode)}/${encodeURIComponent(departureCode)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  )
}

/**
 * One-way soft-action: OPEN/CLOSED → CANCELLED. There is no restore. The tour
 * status is never touched — cancelling the last open departure keeps the tour
 * exactly where it is (the UI surfaces a warning instead).
 */
export function cancelDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): Promise<AgencyDeparture> {
  return apiRequest<AgencyDeparture>(
    `${base(agencyCode, tourCode)}/${encodeURIComponent(departureCode)}/cancel`,
    { method: "POST" }
  )
}