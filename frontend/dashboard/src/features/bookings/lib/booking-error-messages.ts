/**
 * Backend failures, said in words an agency operator can act on.
 *
 * Deliberately free of `@/` imports so `node --test` can load it directly; the
 * `ApiError` adapter lives beside it in `booking-error-adapter.ts`.
 *
 * A raw server message is never shown as-is: it may name database constraints,
 * columns or internal invariants that mean nothing here and leak structure.
 */
const MESSAGES: Record<string, string> = {
  // --- bookings -------------------------------------------------------------
  BOOKING_NOT_FOUND: "This booking does not exist in this agency.",
  BOOKING_TOUR_ARCHIVED:
    "This tour is archived, so it can no longer be booked.",
  BOOKING_DEPARTURE_NOT_OPEN:
    "This departure is not open for new bookings.",
  BOOKING_DEADLINE_PASSED:
    "The booking deadline for this departure has passed.",
  BOOKING_DEPARTURE_STARTED:
    "This departure has already started and can no longer be booked.",
  BOOKING_CAPACITY_EXCEEDED:
    "There are not enough seats left on this departure.",
  BOOKING_PRICE_OPTION_NOT_FOUND:
    "One of the selected pricing options no longer exists on this departure.",
  BOOKING_PRICE_OPTION_INACTIVE:
    "One of the selected pricing options is inactive on this departure.",
  BOOKING_CURRENCY_MISMATCH:
    "The selected pricing options use different currencies; a booking must use one.",
  BOOKING_TOTAL_EXCEEDS_LIMIT:
    "The total for this booking is too large to be recorded.",
  BOOKING_ALREADY_CONFIRMED: "This booking was already confirmed.",
  BOOKING_INVALID_TRANSITION:
    "This booking cannot move to that status from its current one.",
  BOOKING_ALREADY_CANCELLED: "This booking was already cancelled.",
  BOOKING_TRAVELERS_REQUIRED:
    "Confirmation needs traveler details, which are not available yet.",

  // --- linked records -------------------------------------------------------
  CUSTOMER_NOT_FOUND: "This customer does not exist in this agency.",
  CUSTOMER_ARCHIVED: "This customer is archived, so it can no longer be booked.",
  DEPARTURE_NOT_FOUND: "This departure does not exist in this agency.",

  // --- agency access --------------------------------------------------------
  AGENCY_NOT_FOUND: "This agency no longer exists.",
  AGENCY_PERMISSION_DENIED:
    "You do not have permission to do this in this agency.",
  AGENCY_SUSPENDED: "This agency is suspended, so bookings cannot be changed.",
  AGENCY_MEMBERSHIP_INACTIVE:
    "Your access to this agency is suspended.",
}

/**
 * Maps one failed request to a sentence.
 *
 * `status` is the fallback axis: an unrecognised code still produces something
 * truthful rather than "Request failed (409)".
 */
export function bookingErrorMessage(
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
    return "That booking no longer exists. Refresh to see the current list."
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