import type { AgencyMember } from "../types/members.types"

export const OWNER = "OWNER"
export const EMPLOYEE = "EMPLOYEE"

type NamedPerson = {
  firstName: string | null
  lastName: string | null
  email: string
}

/**
 * Ownership comes from `membershipType`, never from a role name.
 *
 * A role called "Owner" would be an authorization object; ownership is a
 * membership fact. Reading it from the role would also break the moment an
 * agency renames or deletes that role.
 */
export function isOwner(member: { membershipType: string }): boolean {
  return member.membershipType === OWNER
}

/** "Ahmed Bensaid", falling back to the email when no name is recorded. */
export function memberDisplayName(person: NamedPerson): string {
  const name = [person.firstName, person.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
  return name || person.email
}

/** Up to two initials for the avatar; falls back to the email's first letter. */
export function memberInitials(person: NamedPerson): string {
  const parts = [person.firstName, person.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  if (parts.length === 0) {
    return person.email.trim().charAt(0).toUpperCase()
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

/** "Owner" or "Employee" — a label, not an authorization input. */
export function membershipTypeLabel(member: { membershipType: string }): string {
  return isOwner(member) ? "Owner" : "Employee"
}

/**
 * How to present the roles column.
 *
 * Zero roles is a valid state, not an error and not "missing data": the person
 * is a member with no business permissions. Saying so plainly beats an empty
 * cell that reads like a loading bug.
 */
export function memberRolesLabel(member: Pick<AgencyMember, "roles">): string {
  if (member.roles.length === 0) return "No roles assigned"
  return member.roles.map((role) => role.name).join(", ")
}

export function hasNoRoles(member: Pick<AgencyMember, "roles">): boolean {
  return member.roles.length === 0
}

/** Membership status wording, scoped to this agency. */
export function membershipStatusLabel(member: {
  membershipStatus: string
}): string {
  return member.membershipStatus === "SUSPENDED" ? "Suspended" : "Active"
}

export function isSuspendedMember(member: { membershipStatus: string }): boolean {
  return member.membershipStatus === "SUSPENDED"
}

/** Short absolute date. Invalid or missing input degrades to a dash. */
export function formatJoinedAt(joinedAt: string, locale = "en-GB"): string {
  const date = new Date(joinedAt)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** The note shown when an add/role form has no roles selected. */
export const NO_ROLES_SELECTED_NOTE =
  "No roles selected — this member will have no business permissions."
