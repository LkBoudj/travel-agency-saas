/**
 * Backend booking contracts, mirrored from `backend/src/bookings`.
 *
 * A booking is one seat claim (`reservedSeats`) on a tour departure, for one
 * business customer of the agency. It never carries an agency or database id
 * on the wire; its only stable external key is the backend-generated `code`
 * (`BKG-...`), which is what the details route is keyed by.
 *
 * The client names its customer, departure and pricing choices by public
 * codes only and NEVER supplies amounts: the backend snapshots `totalAmount`
 * and the `priceLines` from the departure's stored prices under a row lock,
 * so a booking's ledger is never client-authored.
 *
 * Statuses are the backend's uppercase vocabulary, used directly by the UI.
 * `CANCELLED` is terminal and releases the reserved seats back to the
 * departure.
 */
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

/** One booking, from `GET .../bookings` (newest first). */
export interface AgencyBooking {
  code: string;
  status: BookingStatus;
  customer: {
    code: string;
    firstName: string | null;
    lastName: string | null;
  };
  tour: {
    code: string;
    name: string;
  };
  departure: {
    code: string;
    startAt: string;
  };
  reservedSeats: number;
  currency: string;
  totalAmount: number;
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One frozen row of the booking's price snapshot at creation time. */
export interface BookingPriceLine {
  pricingOptionCode: string;
  pricingOptionName: string;
  basis: 'per_person' | 'per_booking';
  currency: string;
  unitAmount: number;
  quantity: number;
  lineTotal: number;
}

/** One recorded lifecycle move, oldest first. */
export interface BookingStatusHistoryEntry {
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorCode: string | null;
  reason: string | null;
  createdAt: string;
}

/** The detail contract: the list row plus price lines and status history. */
export interface BookingDetail extends AgencyBooking {
  priceLines: BookingPriceLine[];
  statusHistory: BookingStatusHistoryEntry[];
}

/** Create body — codes only, never amounts or a target status. */
export interface CreateBookingPayload {
  customerCode: string;
  departureCode: string;
  reservedSeats: number;
  pricingSelections: string[];
  notes?: string | null;
}

/** Cancel body; an absent reason is sent as `null`. */
export interface CancelBookingPayload {
  reason?: string | null;
}

/**
 * One named seat of the booking. Resolves through the booking, so it carries
 * no agency key of its own; the only stable external key is the
 * backend-generated `TRV-...` code.
 */
export interface BookingTraveler {
  code: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Traveler write body — names and contact details only. Amounts and codes are
 * never client-authored; the backend generates the traveler's `TRV-...` code
 * and refuses writes once the booking leaves PENDING.
 */
export interface TravelerWritePayload {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

/** Confirm body — there is none; the transition is a bare POST. */
export type ConfirmBookingPayload = Record<string, never>;
