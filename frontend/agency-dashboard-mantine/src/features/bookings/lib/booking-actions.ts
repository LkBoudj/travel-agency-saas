import type { BookingStatus } from '../types.ts';
import { isTerminalBooking } from './booking-display.ts';

/**
 * The backend keys the bookings UI drives off. Confirmation consumes
 * `AGENCY_BOOKING_UPDATE` (the PENDING → CONFIRMED transition) and the
 * booking's travelers are gated by their own AGENCY module permissions —
 * nothing is invented here that the backend would not enforce.
 */
export const BOOKING_PERMISSIONS = {
  view: 'AGENCY_BOOKING_VIEW',
  create: 'AGENCY_BOOKING_CREATE',
  cancel: 'AGENCY_BOOKING_CANCEL',
  confirm: 'AGENCY_BOOKING_UPDATE',
} as const;

/** The AGENCY permissions behind the booking's traveler records. */
export const TRAVELER_PERMISSIONS = {
  view: 'AGENCY_TRAVELER_VIEW',
  create: 'AGENCY_TRAVELER_CREATE',
  update: 'AGENCY_TRAVELER_UPDATE',
} as const;

/** What the signed-in member may do with a booking's travelers, for UX only. */
export interface BookingTravelerCapabilities {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
}

/** What the signed-in member may do with bookings, as far as the UI can tell. */
export interface BookingCapabilities {
  canView: boolean;
  canCreate: boolean;
  canCancel: boolean;
  canConfirm: boolean;
  traveler: BookingTravelerCapabilities;
}

/**
 * Which actions to render for one booking.
 *
 * Permission is a UX decision only — hiding a control the caller cannot use
 * avoids offering a guaranteed 403, but the backend guard is what enforces
 * it. Cancelling is not offered on a terminal booking: it is a one-way action
 * (`BOOKING_ALREADY_CANCELLED` otherwise). Confirmation only applies while the
 * booking is still PENDING; whether it is actually ready is a traveler-count
 * question answered on the details page, not in a list row.
 */
export function bookingRowActions(
  booking: { status: BookingStatus },
  capabilities: BookingCapabilities
) {
  return {
    canViewDetails: capabilities.canView,
    canCancel: capabilities.canCancel && !isTerminalBooking(booking.status),
    canConfirm: capabilities.canConfirm && booking.status === 'PENDING',
  };
}

export type BookingRowActions = ReturnType<typeof bookingRowActions>;

/** Whether any action at all is available, so an empty menu is never rendered. */
export function hasAnyBookingAction(actions: BookingRowActions): boolean {
  return actions.canViewDetails || actions.canCancel || actions.canConfirm;
}

/**
 * Whether the traveler card can be shown at all. The list endpoint is gated
 * on `AGENCY_TRAVELER_VIEW`, so the card hides (rather than offering a
 * guaranteed 403) when that permission is missing.
 */
export function canViewTravelers(capabilities: BookingCapabilities): boolean {
  return capabilities.traveler.canView;
}
