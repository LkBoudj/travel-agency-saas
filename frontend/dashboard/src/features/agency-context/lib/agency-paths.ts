/**
 * Builders for agency-scoped URLs.
 *
 * Every authenticated route carries its agency in the path, which is what makes
 * two browser tabs able to sit in two different agencies at once: each derives
 * its context from its own URL, and there is no shared "current agency" anywhere
 * for one tab to overwrite for the other.
 */
export const AGENCY_SEGMENT = "/agencies"

export function agencyBasePath(agencyCode: string): string {
  return `${AGENCY_SEGMENT}/${encodeURIComponent(agencyCode)}`
}

export function agencyPath(agencyCode: string, section: string): string {
  const suffix = section.startsWith("/") ? section : `/${section}`
  return `${agencyBasePath(agencyCode)}${suffix}`
}

export const AGENCY_SECTIONS = {
  dashboard: "dashboard",
  trips: "trips",
  bookings: "bookings",
  customers: "customers",
  agency: "agency",
  team: "team",
  settings: "settings",
} as const

export type AgencySection = (typeof AGENCY_SECTIONS)[keyof typeof AGENCY_SECTIONS]

export function agencyDashboardPath(agencyCode: string): string {
  return agencyPath(agencyCode, AGENCY_SECTIONS.dashboard)
}

/**
 * Rewrites a legacy flat path (`/trips`) onto an agency (`/agencies/X/trips`),
 * so old links and bookmarks keep working after the routes gained their agency
 * segment. An unknown path falls back to the dashboard rather than 404ing.
 */
export function legacyPathToAgencyPath(
  agencyCode: string,
  legacyPath: string
): string {
  const section = legacyPath.replace(/^\/+/, "").split("/")[0] ?? ""
  const known = (Object.values(AGENCY_SECTIONS) as string[]).includes(section)
  return agencyPath(agencyCode, known ? section : AGENCY_SECTIONS.dashboard)
}
