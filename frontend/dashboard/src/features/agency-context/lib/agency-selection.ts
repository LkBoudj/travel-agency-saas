import type { MyAgency } from "../types/agency-context.types"

/**
 * An agency can only be entered when the business is operating AND this
 * person's membership in it is active. Both are separate switches: an agency
 * can be suspended by the platform while the membership is fine, and a
 * membership can be suspended inside a perfectly healthy agency.
 */
export function isAgencyEnterable(agency: MyAgency): boolean {
  return agency.status === "ACTIVE" && agency.membershipStatus === "ACTIVE"
}

/** Why an agency cannot be entered, for the chooser to show plainly. */
export function agencyUnavailableReason(agency: MyAgency): string | null {
  if (agency.status !== "ACTIVE") {
    return "This agency is suspended."
  }
  if (agency.membershipStatus !== "ACTIVE") {
    return "Your access to this agency is suspended."
  }
  return null
}

export type AgencySelectionDecision =
  | { kind: "NONE" }
  | { kind: "AUTO"; agencyCode: string }
  | { kind: "CHOOSE" }

/**
 * What the app should do once the user's agencies are known.
 *
 * - no memberships at all -> an honest empty state, not a redirect loop
 * - exactly one ENTERABLE agency -> go straight in; making someone pick from a
 *   list of one is friction with no decision in it
 * - anything else -> show the chooser, which can also explain the unavailable
 *   ones rather than hiding them
 *
 * Note the middle case counts ENTERABLE agencies, not memberships: someone with
 * one active and one suspended membership still goes straight into the active
 * one, and someone whose only membership is suspended sees the chooser with the
 * reason, which is far better than an empty screen.
 */
export function decideAgencySelection(
  agencies: MyAgency[]
): AgencySelectionDecision {
  if (agencies.length === 0) {
    return { kind: "NONE" }
  }

  const enterable = agencies.filter(isAgencyEnterable)
  if (enterable.length === 1) {
    return { kind: "AUTO", agencyCode: enterable[0]!.code }
  }

  return { kind: "CHOOSE" }
}
