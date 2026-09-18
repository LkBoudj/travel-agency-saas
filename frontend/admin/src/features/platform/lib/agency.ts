import type { Agency, AgencyOwner, AgencyStatus } from "../types/agency.types"

/** Human label for an agency status badge. */
export function agencyStatusLabel(status: AgencyStatus): string {
  return status === "SUSPENDED" ? "Suspended" : "Active"
}

/**
 * Best-effort owner display name, falling back to the email when no name parts
 * are set. Mirrors how platform users are displayed.
 */
export function ownerDisplayName(owner: AgencyOwner): string {
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ")
  return name.trim().length > 0 ? name : owner.email
}

/**
 * The secondary line under the owner name. It is omitted when the display name
 * already IS the email, so the same value is never printed twice.
 */
export function ownerSecondaryLine(owner: AgencyOwner): string | null {
  return ownerDisplayName(owner) === owner.email ? null : owner.email
}

/**
 * Text shown when the backend reports no owner. Reaching this means the agency
 * predates the ownership invariants; the UI states that plainly instead of
 * inventing an owner.
 */
export const NO_OWNER_LABEL = "No owner on record"

/** Placeholder for an optional field the agency has not filled in. */
export const EMPTY_FIELD = "—"

/** Renders an optional backend string, never printing "null" or "undefined". */
export function optionalText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : EMPTY_FIELD
}

/** The status a toggle action should move the agency to. */
export function nextAgencyStatus(status: AgencyStatus): AgencyStatus {
  return status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"
}

/** Label for the list/detail status action. */
export function agencyStatusActionLabel(status: AgencyStatus): string {
  return status === "SUSPENDED" ? "Reactivate agency" : "Suspend agency"
}

/** Search/filter summary used by the empty state copy. */
export function isFiltered(search: string, status: AgencyStatus | "ALL"): boolean {
  return search.trim().length > 0 || status !== "ALL"
}

/** Accessible label for a row's action menu trigger. */
export function agencyActionsLabel(agency: Pick<Agency, "name">): string {
  return `Open actions for ${agency.name}`
}
