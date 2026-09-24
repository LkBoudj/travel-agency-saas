import type { AgencyBooking, BookingStatus } from '../../bookings/types.ts';
import type { Customer } from '../../customers/types.ts';
import type { AgencyMember } from '../../members/types.ts';
import type { TourListRow } from '../../trips/types.ts';

/**
 * Pure derivations for the dashboard Overview page.
 *
 * Every function in this file is a node-runnable pure helper: no `@/`
 * imports, no `import.meta.env`, no React. The page surfaces real counts and
 * a bounded recent-booking slice from data the agency already loads through
 * the feature list queries — no new backend calls.
 */

/** All statuses the backend can report, so the tally is exhaustive. */
export const BOOKING_STATUSES: readonly BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED'];

/** Count of each booking status in a list. Every status key is present. */
export function tallyBookings(bookings: readonly AgencyBooking[]): Record<BookingStatus, number> {
  return bookings.reduce<Record<BookingStatus, number>>(
    (tally, booking) => {
      tally[booking.status] += 1;
      return tally;
    },
    { PENDING: 0, CONFIRMED: 0, CANCELLED: 0 }
  );
}

/** Number of ACTIVE (non-archived) customers. */
export function countActiveCustomers(customers: readonly Customer[]): number {
  return customers.filter((customer) => customer.status === 'ACTIVE').length;
}

/** Number of PUBLISHED tours — the public-facing offer. */
export function countPublishedTours(tours: readonly TourListRow[]): number {
  return tours.filter((tour) => tour.status === 'PUBLISHED').length;
}

/** Number of ACTIVE memberships in the agency. */
export function countActiveMembers(members: readonly AgencyMember[]): number {
  return members.filter((member) => member.membershipStatus === 'ACTIVE').length;
}

/**
 * The most recent bookings, newest first (the backend list is already
 * newest-first; this only bounds the slice shown on the Overview).
 */
export function recentBookings(bookings: readonly AgencyBooking[], limit: number): AgencyBooking[] {
  return bookings.slice(0, limit);
}
