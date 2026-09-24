import type { BookingStatus } from '../types.ts';

/**
 * Query keys.
 *
 * Every key starts with the agency code, so two agencies keep separate caches
 * and a mutation in one can never invalidate the other's data. `search` and
 * `status` are part of the list key because they change what the backend
 * returns.
 */
export const bookingsQueryKeys = {
  all: (agencyCode: string) => ['agency', agencyCode, 'bookings'] as const,
  list: (agencyCode: string, search: string, status: BookingStatus | undefined) =>
    ['agency', agencyCode, 'bookings', 'list', search, status ?? 'all'] as const,
  detail: (agencyCode: string, bookingCode: string) =>
    ['agency', agencyCode, 'bookings', 'detail', bookingCode] as const,
  travelers: (agencyCode: string, bookingCode: string) =>
    ['agency', agencyCode, 'bookings', bookingCode, 'travelers'] as const,
};
