import {
  classifyDepartureActionError,
  type DepartureActionFailureKind,
} from './departure-errors.ts';

type Translate = (key: string) => string;

const DEPARTURE_ERROR_KEYS: Record<DepartureActionFailureKind, string> = {
  'tour-not-found': 'errors.tourNotFound',
  'departure-not-found': 'errors.departureNotFound',
  'already-cancelled': 'errors.alreadyCancelled',
  'capacity-below-reserved': 'errors.capacityBelowReserved',
  'has-active-bookings': 'errors.hasActiveBookings',
  network: 'errors.network',
  unknown: 'errors.generic',
};

export function getDepartureErrorMessage(error: unknown, t: Translate): string {
  return t(DEPARTURE_ERROR_KEYS[classifyDepartureActionError(error)]);
}
