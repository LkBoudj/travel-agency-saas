/**
 * Backend failures, said in words an agency operator can act on.
 *
 * Deliberately free of `@/` imports so `node --test` can load it directly; the
 * `ApiError` adapter lives beside it in `tour-error-adapter.ts`.
 *
 * A raw server message is never shown as-is: it may name database constraints,
 * columns or internal invariants that mean nothing here and leak structure.
 */
const MESSAGES: Record<string, string> = {
  // --- tours ---------------------------------------------------------------
  TOUR_NOT_FOUND:
    "This trip does not exist in this agency, or is not readable by you.",
  TOUR_ALREADY_ARCHIVED: "This trip was already archived.",
  TOUR_PUBLISH_STATE_BLOCKED:
    "An archived trip cannot be published or unpublished.",
  TOUR_PUBLISH_READINESS_BLOCKED:
    "This trip is not ready to publish yet. Complete the required fields first — scheduled trips also need at least one open departure.",

  // --- departures -----------------------------------------------------------
  DEPARTURE_NOT_FOUND:
    "That departure no longer exists in this trip. Refresh to see the current list.",
  DEPARTURE_ALREADY_CANCELLED:
    "This departure was already cancelled.",

  // --- pricing --------------------------------------------------------------
  PRICING_OPTION_NOT_FOUND:
    "That pricing option no longer exists in this trip. Refresh to see the current list.",
  PRICING_OPTION_NAME_TAKEN:
    "Another pricing option already uses this name.",
  PRICING_OPTION_INACTIVE:
    "This pricing option is inactive, so it cannot be used in a new price set.",
  PRICING_OPTION_ALREADY_INACTIVE:
    "This pricing option is already inactive.",
  PRICING_CURRENCY_MISMATCH:
    "The prices must be in the tour's currency; use the same currency everywhere in this trip.",

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
export function tourErrorMessage(
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
    return "That trip no longer exists. Refresh to see the current list."
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