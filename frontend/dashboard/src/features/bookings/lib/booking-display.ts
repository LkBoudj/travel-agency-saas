import type { BookingStatus } from "../types/bookings.types"

/** Only `CANCELLED` is terminal — the backend's one-way release of seats. */
export function isTerminalBooking(status: BookingStatus): boolean {
  return status === "CANCELLED"
}

/** Whether a non-terminal booking can still be cancelled. */
export function canCancelBooking(booking: { status: BookingStatus }): boolean {
  return !isTerminalBooking(booking.status)
}

/**
 * How to name a booking's customer in the UI.
 *
 * The list/detail contract only carries the recorded name and the code — no
 * email or phone — so fallbacks are name parts joined, then the code, which is
 * always there as the last truthful fallback.
 */
export function bookingCustomerName(customer: {
  code: string
  firstName: string | null
  lastName: string | null
}): string {
  const name = [customer.firstName, customer.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")

  return name || customer.code
}

/** Short absolute date. Invalid or missing input degrades to a dash. */
export function formatBookingDate(value: string, locale = "en-GB"): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Formats a booking amount in its own currency.
 *
 * Amounts are stored with up to two decimals (the pricing UI edits them at a
 * 0.01 step), so the ledger shows them exactly rather than rounding to whole
 * units like the tour cards do. Invalid or missing values degrade to a dash.
 */
export function formatBookingAmount(
  value: number | null | undefined,
  currency: string,
  locale = "en-GB"
): string {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}