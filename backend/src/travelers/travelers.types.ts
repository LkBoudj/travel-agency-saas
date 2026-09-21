import type { Prisma } from '../generated/prisma/client.js';

/**
 * One named seat of a Booking (Module J).
 *
 * Travelers resolve through their Booking (`:agencyCode` + `:bookingCode`),
 * so tenancy is inherited and a traveler row never carries an `agency_id`. The
 * public contract exposes only public codes and the recorded details — never
 * the database id or anything tenant-internal.
 */
export interface TravelerResponse {
  code: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The columns the traveler contract renders. */
export const TRAVELER_SELECT = {
  code: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.BookingTravelerSelect;

export type TravelerRow = Prisma.BookingTravelerGetPayload<{
  select: typeof TRAVELER_SELECT;
}>;

export function toTravelerResponse(row: TravelerRow): TravelerResponse {
  return {
    code: row.code,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * The booking columns this module resolves before any traveler read/write:
 * the id for scoping, the status for the PENDING-only write rule, and the
 * immutable `reservedSeats` for the `limitReached` and confirmation-mismatch
 * checks.
 */
export const TRAVELER_BOOKING_SELECT = {
  id: true,
  code: true,
  status: true,
  reservedSeats: true,
} as const satisfies Prisma.BookingSelect;

export type TravelerBookingRow = Prisma.BookingGetPayload<{
  select: typeof TRAVELER_BOOKING_SELECT;
}>;