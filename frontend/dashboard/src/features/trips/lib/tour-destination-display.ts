import type { TourLocation } from "../types/tour.types"

/**
 * The human-readable name of one structured location.
 *
 * The hierarchy: a specific `place` is what travelers remember, then the
 * city/commune, then the wilaya. The backend stores wilaya codes and free text
 * without ever resolving labels, so the first populated segment wins here.
 */
export function tourLocationName(location: TourLocation | undefined): string {
  if (!location) return ""
  return (
    location.place?.trim() || location.cityId?.trim() || location.wilayaCode?.trim() || ""
  )
}

/** Convenience for the trips table: the primary destination's display name. */
export function tourPrimaryDestinationName(
  destinations: TourLocation[]
): string {
  return tourLocationName(destinations[0])
}