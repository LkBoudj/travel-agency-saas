/**
 * Backend failures, said in words an agency operator can act on.
 *
 * Deliberately free of `@/` imports so `node --test` can load it directly; the
 * `ApiError` adapter lives beside it in `member-error-adapter.ts`.
 *
 * A raw server message is never shown as-is: it may name database constraints,
 * columns or internal invariants that mean nothing here and leak structure.
 */
const MESSAGES: Record<string, string> = {
  // --- adding ---------------------------------------------------------------
  ALREADY_AGENCY_MEMBER: "This person is already a member of this agency.",
  MEMBER_APP_USER_NOT_ACTIVE:
    "This account is not active, so it cannot be added to the agency.",
  MEMBER_APP_USER_NOT_FOUND: "That account no longer exists.",
  EMAIL_ALREADY_REGISTERED:
    "An account with this email already exists. Add them as an existing user instead.",

  // --- roles ----------------------------------------------------------------
  UNKNOWN_AGENCY_ROLE_KEYS:
    "One of the selected roles no longer exists. Refresh and try again.",
  ROLE_NOT_ASSIGNABLE_IN_AGENCY:
    "One of the selected roles cannot be assigned in this agency.",

  // --- ownership invariants -------------------------------------------------
  OWNER_ROLES_IMMUTABLE:
    "The owner's roles cannot be changed. Transfer ownership first.",
  OWNER_CANNOT_BE_SUSPENDED:
    "The owner cannot be suspended. Transfer ownership first, or suspend the agency.",
  OWNER_CANNOT_BE_REMOVED:
    "The owner cannot be removed. Transfer ownership first.",

  // --- lookup ---------------------------------------------------------------
  AGENCY_MEMBER_NOT_FOUND:
    "This member is no longer part of this agency. Refresh to see the current list.",
  AGENCY_NOT_FOUND: "This agency no longer exists.",

  // --- access ---------------------------------------------------------------
  AGENCY_PERMISSION_DENIED:
    "You do not have permission to do this in this agency.",
  AGENCY_SUSPENDED: "This agency is suspended, so it cannot be changed.",
  AGENCY_MEMBERSHIP_REQUIRED: "You are not a member of this agency.",
  AGENCY_MEMBERSHIP_INACTIVE: "Your access to this agency is suspended.",
}

/**
 * Maps one failed request to a sentence.
 *
 * `status` is the fallback axis: an unrecognised code still produces something
 * truthful rather than "Request failed (409)".
 */
export function memberErrorMessage(
  status: number,
  errorCode?: string,
  serverMessage?: string
): string {
  if (errorCode && MESSAGES[errorCode]) return MESSAGES[errorCode]

  if (status === 401) {
    return "Your session has expired. Sign in again to continue."
  }
  if (status === 403) {
    return "You do not have permission to do this in this agency."
  }
  if (status === 404) {
    return "That item no longer exists. Refresh to see the current list."
  }
  if (status === 409) {
    return "That change conflicts with the current state. Refresh and try again."
  }
  if (status === 400) {
    // A validation message is written for a human and is safe to relay;
    // anything else gets the generic wording.
    return serverMessage?.trim() || "Some of the details are not valid."
  }
  if (status >= 500) {
    return "Something went wrong on our side. Please try again."
  }

  return "Something went wrong. Please try again."
}

/** True when the session is gone and the app should hand over to sign-in. */
export function isSessionExpired(status: number): boolean {
  return status === 401
}
