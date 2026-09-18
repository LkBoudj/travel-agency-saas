import type { PlatformUser } from "../types/platform-user.types"

/** Best-effort display name, falling back to the email when both are unset. */
export function userDisplayName(user: Pick<PlatformUser, "firstName" | "lastName" | "email">): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return name.trim().length > 0 ? name : user.email
}

/** Comma-separated platform role names for table display. */
export function userRolesLabel(user: Pick<PlatformUser, "roles">): string {
  const names = user.roles.map((role) => role.name)
  return names.length > 0 ? names.join(", ") : "No roles"
}