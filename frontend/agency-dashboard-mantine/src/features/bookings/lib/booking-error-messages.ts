import { classifyBookingActionError, type BookingActionFailureKind } from './booking-errors.ts';

type Translate = (key: string) => string;

const BOOKING_ERROR_KEYS: Record<BookingActionFailureKind, string> = {
  'booking-not-found': 'errors.bookingNotFound',
  'customer-not-found': 'errors.customerNotFound',
  'customer-archived': 'errors.customerArchived',
  'departure-not-found': 'errors.departureNotFound',
  'departure-not-open': 'errors.departureNotOpen',
  'departure-started': 'errors.departureStarted',
  'deadline-passed': 'errors.deadlinePassed',
  'capacity-exceeded': 'errors.capacityExceeded',
  'tour-archived': 'errors.tourArchived',
  'tours-not-found': 'errors.toursNotFound',
  'price-option-not-found': 'errors.priceOptionNotFound',
  'price-option-inactive': 'errors.priceOptionInactive',
  'currency-mismatch': 'errors.currencyMismatch',
  'total-exceeds-limit': 'errors.totalExceedsLimit',
  'already-confirmed': 'errors.alreadyConfirmed',
  'already-cancelled': 'errors.alreadyCancelled',
  'invalid-transition': 'errors.invalidTransition',
  'travelers-frozen': 'errors.travelersFrozen',
  'traveler-limit-reached': 'errors.travelerLimitReached',
  'traveler-count-mismatch': 'errors.travelerCountMismatch',
  'traveler-not-found': 'errors.travelerNotFound',
  'agency-not-found': 'errors.agencyNotFound',
  'agency-suspended': 'errors.agencySuspended',
  'membership-inactive': 'errors.membershipInactive',
  'permission-denied': 'errors.permissionDenied',
  network: 'errors.network',
  unknown: 'errors.generic',
};

export function getBookingErrorMessage(error: unknown, t: Translate): string {
  return t(BOOKING_ERROR_KEYS[classifyBookingActionError(error)]);
}

/** The i18n key behind a failure kind — used to build the bookings namespace. */
export function bookingErrorKey(kind: BookingActionFailureKind): string {
  return BOOKING_ERROR_KEYS[kind];
}
