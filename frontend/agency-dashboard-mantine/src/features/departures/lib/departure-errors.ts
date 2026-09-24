import { ApiError } from '../../../services/api-error.ts';

export type DepartureActionFailureKind =
  | 'tour-not-found'
  | 'departure-not-found'
  | 'already-cancelled'
  | 'capacity-below-reserved'
  | 'has-active-bookings'
  | 'network'
  | 'unknown';

/** Maps departure backend errorCodes to a stable UI failure kind. */
export function classifyDepartureActionError(error: unknown): DepartureActionFailureKind {
  if (error instanceof ApiError && error.code) {
    switch (error.code) {
      case 'TOUR_NOT_FOUND':
        return 'tour-not-found';
      case 'DEPARTURE_NOT_FOUND':
        return 'departure-not-found';
      case 'DEPARTURE_ALREADY_CANCELLED':
        return 'already-cancelled';
      case 'DEPARTURE_CAPACITY_BELOW_RESERVED':
        return 'capacity-below-reserved';
      case 'DEPARTURE_HAS_ACTIVE_BOOKINGS':
        return 'has-active-bookings';
      default:
        return 'unknown';
    }
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}
