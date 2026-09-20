import type { CreateBookingPayload } from "../types/bookings.types"

/**
 * Turns the booking form into the create payload.
 *
 * The route's agency scopes everything, so only public codes leave here: the
 * customer (`CUS-...`), the departure (`DEP-...`) and the chosen pricing
 * options (`PRC-...`). Amounts are deliberately NOT sent — the server computes
 * the snapshot from the departure's stored prices. `tourCode` is form-only and
 * never crosses the wire.
 *
 * A blank notes field means "no value", never a stored `""` stub: the backend
 * persists `null` for it.
 */
export function buildCreateBookingPayload(input: {
  customerCode: string
  departureCode: string
  reservedSeats: string
  pricingSelections: string[]
  notes: string
}): CreateBookingPayload {
  const notes = input.notes.trim()
  return {
    customerCode: input.customerCode.trim(),
    departureCode: input.departureCode.trim(),
    reservedSeats: Number(input.reservedSeats),
    pricingSelections: input.pricingSelections,
    notes: notes.length === 0 ? null : notes,
  }
}

/**
 * Turns an optional cancel reason into the cancel payload. A blank reason is
 * sent as `null` — the backend contract reads an omitted value exactly like a
 * stored `null`.
 */
export function buildCancelBookingPayload(reason: string): {
  reason: string | null
} {
  const trimmed = reason.trim()
  return { reason: trimmed.length === 0 ? null : trimmed }
}