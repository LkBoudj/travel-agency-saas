import { apiRequest } from "@/lib/api"
import type {
  AgencyTour,
  TourListItem,
  TourPayload,
  TourStatus,
} from "../types/tour.types"

/**
 * Query keys.
 *
 * Every key starts with the agency code, so two tabs in two agencies keep
 * separate caches and a mutation in one can never invalidate the other's data.
 * `search` and `status` are part of the list key because they change what the
 * backend returns.
 */
export const toursQueryKeys = {
  all: (agencyCode: string) => ["agency", agencyCode, "tours"] as const,
  list: (
    agencyCode: string,
    search: string,
    status: TourStatus | undefined
  ) =>
    ["agency", agencyCode, "tours", "list", search, status ?? "all"] as const,
  detail: (agencyCode: string, tourCode: string) =>
    ["agency", agencyCode, "tours", "detail", tourCode] as const,
}

function base(agencyCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}`
}

function codePath(tourCode: string): string {
  return encodeURIComponent(tourCode)
}

export function listTours(
  agencyCode: string,
  search: string,
  status?: TourStatus
): Promise<TourListItem[]> {
  const params = new URLSearchParams()
  const trimmed = search.trim()
  if (trimmed) params.set("search", trimmed)
  if (status) params.set("status", status)
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest<TourListItem[]>(`${base(agencyCode)}/tours${query}`)
}

/** Reads by code; ARCHIVED tours remain readable so stored links keep working. */
export function getTour(
  agencyCode: string,
  tourCode: string
): Promise<AgencyTour> {
  return apiRequest<AgencyTour>(
    `${base(agencyCode)}/tours/${codePath(tourCode)}`
  )
}

/** Creates a DRAFT — the backend never auto-publishes. */
export function createTour(
  agencyCode: string,
  payload: TourPayload
): Promise<AgencyTour> {
  return apiRequest<AgencyTour>(`${base(agencyCode)}/tours`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/**
 * Full aggregate replacement. Status is unchanged by the payload — it moves
 * only through publish / unpublish / archive.
 */
export function updateTour(
  agencyCode: string,
  tourCode: string,
  payload: TourPayload
): Promise<AgencyTour> {
  return apiRequest<AgencyTour>(
    `${base(agencyCode)}/tours/${codePath(tourCode)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  )
}

/** PUBLISHED ← implicit from DRAFT (idempotent for PUBLISHED; 409 for ARCHIVED). */
export function publishTour(
  agencyCode: string,
  tourCode: string
): Promise<AgencyTour> {
  return apiRequest<AgencyTour>(
    `${base(agencyCode)}/tours/${codePath(tourCode)}/publish`,
    { method: "POST" }
  )
}

/** PUBLISHED → DRAFT (no-op for DRAFT; 409 for ARCHIVED). */
export function unpublishTour(
  agencyCode: string,
  tourCode: string
): Promise<AgencyTour> {
  return apiRequest<AgencyTour>(
    `${base(agencyCode)}/tours/${codePath(tourCode)}/unpublish`,
    { method: "POST" }
  )
}

/** One-way soft-delete. The row stays readable by code, leaves the listing. */
export function archiveTour(
  agencyCode: string,
  tourCode: string
): Promise<AgencyTour> {
  return apiRequest<AgencyTour>(
    `${base(agencyCode)}/tours/${codePath(tourCode)}/archive`,
    { method: "PATCH" }
  )
}