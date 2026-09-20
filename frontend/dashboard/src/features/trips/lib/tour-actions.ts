export const TOUR_PERMISSIONS = {
  view: "AGENCY_TOUR_VIEW",
  create: "AGENCY_TOUR_CREATE",
  update: "AGENCY_TOUR_UPDATE",
  publish: "AGENCY_TOUR_PUBLISH",
  delete: "AGENCY_TOUR_DELETE",
} as const

/** What the signed-in member may do with trips, as far as the UI can tell. */
export type TourCapabilities = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canPublish: boolean
  canArchive: boolean
}

export type TourStatusLike = string

/** Lifecycle of the backend tour status, surfaced as the UI-level one. */
export function isArchivedTourStatus(status: TourStatusLike): boolean {
  return status === "ARCHIVED"
}

/**
 * Which operations make sense for one tour row.
 *
 * Permission is a UX decision only — the backend guard is what enforces it.
 * Publishing is hidden for ARCHIVED tours (it would 409), and archiving is
 * hidden once it already happened (it is one-way, `TOUR_ALREADY_ARCHIVED`).
 */
export function tourRowActions(
  status: TourStatusLike,
  capabilities: TourCapabilities
) {
  const archived = isArchivedTourStatus(status)

  return {
    canEdit: capabilities.canUpdate,
    canPublish: capabilities.canPublish && !archived,
    canArchive: capabilities.canArchive && !archived,
  }
}

export type TourRowActions = ReturnType<typeof tourRowActions>