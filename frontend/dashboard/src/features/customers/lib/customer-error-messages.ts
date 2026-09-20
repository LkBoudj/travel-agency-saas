/**
 * Backend failures, said in words an agency operator can act on.
 *
 * Deliberately free of `@/` imports so `node --test` can load it directly; the
 * `ApiError` adapter lives beside it in `customer-error-adapter.ts`.
 *
 * A raw server message is never shown as-is: it may name database constraints,
 * columns or internal invariants that mean nothing here and leak structure.
 */
const MESSAGES: Record<string, string> = {
  // --- customers ------------------------------------------------------------
  CUSTOMER_NOT_FOUND:
    "This customer does not exist in this agency, or has been archived.",
  CUSTOMER_ALREADY_ARCHIVED:
    "This customer was already archived.",

  // --- agency access --------------------------------------------------------
  AGENCY_NOT_FOUND: "This agency no longer exists.",
  AGENCY_PERMISSION_DENIED:
    "You do not have permission to do this in this agency.",
  AGENCY_SUSPENDED: "This agency is suspended, so it cannot be changed.",
  AGENCY_MEMBERSHIP_INACTIVE:
    "Your access to this agency is suspended.",
}

/**
 * Maps one failed request to a sentence.
 *
 * `status` is the fallback axis: an unrecognised code still produces something
 * truthful rather than "Request failed (409)".
 */
export function customerErrorMessage(
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
    return "That customer no longer exists. Refresh to see the current list."
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