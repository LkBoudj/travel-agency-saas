/**
 * Backend booking contracts, mirrored from `backend/src/bookings`.
 *
 * A booking is one seat claim (`reservedSeats`) on a tour departure, for one
 * business customer of the agency in the route's `:agencyCode`. It never
 * carries an agency or database id on the wire; its only stable external key
 * is the backend-generated `code` (`BKG-...`), which is what the details
 * route is keyed by.
 *
 * The client names its customer, departure and pricing choices by public
 * codes only and NEVER supplies amounts: the backend snapshots `totalAmount`
 * and the `priceLines` from the departure's stored prices under a row lock,
 * so a booking's ledger is never client-authored.
 *
 * Statuses are the backend's uppercase vocabulary, used directly by the UI.
 * `CANCELLED` is terminal and releases the reserved seats back to the
 * departure; confirmation is deferred until travelers (a later module).
 */
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED"

/** One booking, from `GET .../bookings` (newest first). */
export type AgencyBooking = {
  code: string
  status: BookingStatus
  customer: {
    code: string
    firstName: string | null
    lastName: string | null
  }
  tour: {
    code: string
    name: string
  }
  departure: {
    code: string
    startAt: string
  }
  reservedSeats: number
  currency: string
  totalAmount: number
  notes: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  createdAt: string
  updatedAt: string
}

/** One frozen row of the booking's price snapshot at creation time. */
export type BookingPriceLine = {
  pricingOptionCode: string
  pricingOptionName: string
  basis: "per_person" | "per_booking"
  currency: string
  unitAmount: number
  quantity: number
  lineTotal: number
}

/** One recorded lifecycle move, oldest first. */
export type BookingStatusHistoryEntry = {
  fromStatus: BookingStatus | null
  toStatus: BookingStatus
  actorCode: string | null
  reason: string | null
  createdAt: string
}

/** The detail contract: the list row plus price lines and status history. */
export type BookingDetail = AgencyBooking & {
  priceLines: BookingPriceLine[]
  statusHistory: BookingStatusHistoryEntry[]
}

/** Create body — codes only, never amounts or a target status. */
export type CreateBookingPayload = {
  customerCode: string
  departureCode: string
  reservedSeats: number
  pricingSelections: string[]
  notes?: string | null
}

/** Cancel body; an absent reason is sent as `null`. */
export type CancelBookingPayload = {
  reason?: string | null
}

/** Presentation keys for booking statuses, resolved through i18next. */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "bookings:status.pending",
  CONFIRMED: "bookings:status.confirmed",
  CANCELLED: "bookings:status.cancelled",
}