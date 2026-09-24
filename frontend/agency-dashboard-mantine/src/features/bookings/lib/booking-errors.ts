import { ApiError } from '../../../services/api-error.ts';

/**
 * Booking UI failure kinds.
 *
 * Kinds are the stable vocabulary the UI switches on; the raw backend codes
 * are mapped here so messages never leak server vocabulary. Falling back by
 * kind (rather than per-code) keeps every failure producing a truthful,
 * actionable sentence.
 */
export type BookingActionFailureKind =
  | 'booking-not-found'
  | 'customer-not-found'
  | 'customer-archived'
  | 'departure-not-found'
  | 'departure-not-open'
  | 'departure-started'
  | 'deadline-passed'
  | 'capacity-exceeded'
  | 'tour-archived'
  | 'tours-not-found'
  | 'price-option-not-found'
  | 'price-option-inactive'
  | 'currency-mismatch'
  | 'total-exceeds-limit'
  | 'already-confirmed'
  | 'already-cancelled'
  | 'invalid-transition'
  | 'travelers-frozen'
  | 'traveler-limit-reached'
  | 'traveler-count-mismatch'
  | 'traveler-not-found'
  | 'agency-not-found'
  | 'agency-suspended'
  | 'membership-inactive'
  | 'permission-denied'
  | 'network'
  | 'unknown';

const CODE_TO_KIND: Record<string, BookingActionFailureKind> = {
  BOOKING_NOT_FOUND: 'booking-not-found',
  BOOKING_TOUR_ARCHIVED: 'tour-archived',
  BOOKING_DEPARTURE_NOT_OPEN: 'departure-not-open',
  BOOKING_DEADLINE_PASSED: 'deadline-passed',
  BOOKING_DEPARTURE_STARTED: 'departure-started',
  BOOKING_CAPACITY_EXCEEDED: 'capacity-exceeded',
  BOOKING_PRICE_OPTION_NOT_FOUND: 'price-option-not-found',
  BOOKING_PRICE_OPTION_INACTIVE: 'price-option-inactive',
  BOOKING_CURRENCY_MISMATCH: 'currency-mismatch',
  BOOKING_TOTAL_EXCEEDS_LIMIT: 'total-exceeds-limit',
  BOOKING_ALREADY_CONFIRMED: 'already-confirmed',
  BOOKING_INVALID_TRANSITION: 'invalid-transition',
  BOOKING_ALREADY_CANCELLED: 'already-cancelled',
  BOOKING_TRAVELERS_FROZEN: 'travelers-frozen',
  BOOKING_TRAVELER_LIMIT_REACHED: 'traveler-limit-reached',
  BOOKING_TRAVELER_COUNT_MISMATCH: 'traveler-count-mismatch',
  TRAVELER_NOT_FOUND: 'traveler-not-found',
  CUSTOMER_NOT_FOUND: 'customer-not-found',
  CUSTOMER_ARCHIVED: 'customer-archived',
  DEPARTURE_NOT_FOUND: 'departure-not-found',
  TOUR_NOT_FOUND: 'tours-not-found',
  AGENCY_NOT_FOUND: 'agency-not-found',
  AGENCY_SUSPENDED: 'agency-suspended',
  AGENCY_MEMBERSHIP_INACTIVE: 'membership-inactive',
  AGENCY_PERMISSION_DENIED: 'permission-denied',
};

/**
 * Maps a thrown error to a stable booking UI failure kind.
 *
 * Known backend codes classify precisely; an unrecognised `ApiError` falls
 * through to a status-based guess (a 401/403 is a session/permission problem,
 * anything else is unknown). Network-level failures (`TypeError`) and plain
 * errors land on their own kinds, and an `ApiError` with no code still never
 * surfaces raw server text.
 */
export function classifyBookingActionError(error: unknown): BookingActionFailureKind {
  if (error instanceof ApiError) {
    if (error.code && CODE_TO_KIND[error.code]) {
      return CODE_TO_KIND[error.code];
    }
    if (error.status === 401) {
      return 'permission-denied';
    }
    if (error.status === 403) {
      return 'permission-denied';
    }
    return 'unknown';
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}
