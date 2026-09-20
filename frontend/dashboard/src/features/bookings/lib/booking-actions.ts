// Explicit .ts extension: this module is loaded directly by `node --test`,
// whose ESM resolver does not guess extensions. `allowImportingTsExtensions`
// is enabled and Vite resolves it, so one definition serves both.
import type { BookingStatus } from "../types/bookings.types"
import { isTerminalBooking } from "./booking-display.ts"

/**
 * The backend keys the bookings UI drives off. Confirmation (`_UPDATE`) and
 * adjustment (`_ADJUST`) exist server-side, but confirmation stays readiness-
 * gated on travelers, so no control consumes them yet — nothing is invented
 * here that the backend would not enforce.
 */
export const BOOKING_PERMISSIONS = {
  view: "AGENCY_BOOKING_VIEW",
  create: "AGENCY_BOOKING_CREATE",
  cancel: "AGENCY_BOOKING_CANCEL",
} as const

/** What the signed-in member may do with bookings, as far as the UI can tell. */
export type BookingCapabilities = {
  canView: boolean
  canCreate: boolean
  canCancel: boolean
}

/**
 * Which actions to render for one booking.
 *
 * Permission is a UX decision only — hiding a control the caller cannot use
 * avoids offering a guaranteed 403, but the backend guard is what enforces
 * it. Cancelling is not offered on a terminal booking: it is a one-way action
 * (`BOOKING_ALREADY_CANCELLED` otherwise).
 */
export function bookingRowActions(
  booking: { status: BookingStatus },
  capabilities: BookingCapabilities
) {
  return {
    canViewDetails: capabilities.canView,
    canCancel: capabilities.canCancel && !isTerminalBooking(booking.status),
  }
}

export type BookingRowActions = ReturnType<typeof bookingRowActions>

/** Whether any action at all is available, so an empty menu is never rendered. */
export function hasAnyBookingAction(actions: BookingRowActions): boolean {
  return actions.canViewDetails || actions.canCancel
}