import type {
  MembershipStatus,
  ReplaceRolesPayload,
  SetMemberStatusPayload,
} from "../types/members.types"

/** Drops blanks and duplicates, so the request says exactly what was chosen. */
export function normalizeRoleKeys(roleKeys: readonly string[]): string[] {
  const seen = new Set<string>()
  for (const key of roleKeys) {
    const trimmed = key.trim()
    if (trimmed) seen.add(trimmed)
  }
  return [...seen]
}

/** A complete replacement, not a patch: whatever is sent becomes the member's
 * entire role set, and an empty list is a valid way to clear every role.
 */
export function buildReplaceRolesPayload(
  roleKeys: readonly string[]
): ReplaceRolesPayload {
  return { roleKeys: normalizeRoleKeys(roleKeys) }
}

export function buildSetStatusPayload(
  status: MembershipStatus
): SetMemberStatusPayload {
  return { status }
}

/** Suspending and reactivating are the same endpoint with the target state. */
export function suspendPayload(): SetMemberStatusPayload {
  return buildSetStatusPayload("SUSPENDED")
}

export function reactivatePayload(): SetMemberStatusPayload {
  return buildSetStatusPayload("ACTIVE")
}
