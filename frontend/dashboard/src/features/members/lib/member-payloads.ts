import type {
  AddMemberPayload,
  MembershipStatus,
  ReplaceRolesPayload,
  SetMemberStatusPayload,
} from "../types/members.types"

/** Trims, and turns an empty string into null the way the backend expects. */
function optionalName(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Drops blanks and duplicates, so the request says exactly what was chosen. */
export function normalizeRoleKeys(roleKeys: readonly string[]): string[] {
  const seen = new Set<string>()
  for (const key of roleKeys) {
    const trimmed = key.trim()
    if (trimmed) seen.add(trimmed)
  }
  return [...seen]
}

/** Adding someone who already has an account: identified by code, never typed. */
export function buildAddExistingMemberPayload(input: {
  appUserCode: string
  roleKeys: readonly string[]
}): AddMemberPayload {
  return {
    member: { type: "EXISTING", appUserCode: input.appUserCode.trim() },
    roleKeys: normalizeRoleKeys(input.roleKeys),
  }
}

/**
 * Creating an account and adding it in one step.
 *
 * `confirmPassword` exists only to catch a typo in the browser and is
 * deliberately absent here — the backend schema is `.strict()` and would reject
 * it, and sending a second copy of a password serves no purpose. The same goes
 * for `membershipType`, status and any id: the server always creates an ACTIVE
 * EMPLOYEE, and a client must never be able to ask for anything else.
 */
export function buildAddNewMemberPayload(input: {
  firstName?: string | null
  lastName?: string | null
  email: string
  password: string
  roleKeys: readonly string[]
}): AddMemberPayload {
  return {
    member: {
      type: "NEW",
      email: input.email.trim().toLowerCase(),
      password: input.password,
      firstName: optionalName(input.firstName),
      lastName: optionalName(input.lastName),
    },
    roleKeys: normalizeRoleKeys(input.roleKeys),
  }
}

/**
 * A complete replacement, not a patch: whatever is sent becomes the member's
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
