import { apiRequest } from "@/lib/api"
import type {
  AgencyBooking,
  BookingDetail,
  BookingStatus,
  BookingTraveler,
  CreateBookingPayload,
  TravelerWritePayload,
} from "../types/bookings.types"

/**
 * Query keys.
 *
 * Every key starts with the agency code, so two tabs in two agencies keep
 * separate caches and a mutation in one can never invalidate the other's data.
 * `search` and `status` are part of the list key because they change what the
 * backend returns.
 */
export const bookingsQueryKeys = {
  all: (agencyCode: string) => ["agency", agencyCode, "bookings"] as const,
  list: (
    agencyCode: string,
    search: string,
    status: BookingStatus | undefined
  ) =>
    [
      "agency",
      agencyCode,
      "bookings",
      "list",
      search,
      status ?? "all",
    ] as const,
  detail: (agencyCode: string, bookingCode: string) =>
    ["agency", agencyCode, "bookings", "detail", bookingCode] as const,
  travelers: (agencyCode: string, bookingCode: string) =>
    ["agency", agencyCode, "bookings", bookingCode, "travelers"] as const,
}

function base(agencyCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}`
}

/**
 * The agency's bookings, newest first, filtered by the backend.
 *
 * `search` matches the booking code, customer name or tour name; `status` is
 * an optional lifecycle filter. The server search is a real query, not a
 * prefix cache: filtering a partial client list would hide matches.
 */
export function listBookings(
  agencyCode: string,
  search: string,
  status?: BookingStatus
): Promise<AgencyBooking[]> {
  const params = new URLSearchParams()
  const trimmed = search.trim()
  if (trimmed) params.set("search", trimmed)
  if (status) params.set("status", status)
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest<AgencyBooking[]>(`${base(agencyCode)}/bookings${query}`)
}

/** Reads one booking by code; cancelled bookings remain readable. */
export function getBooking(
  agencyCode: string,
  bookingCode: string
): Promise<BookingDetail> {
  return apiRequest<BookingDetail>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}`
  )
}

/**
 * Creates a PENDING booking. Amounts are never sent: the backend computes the
 * price-line snapshot from the departure's stored prices under a row lock.
 */
export function createBooking(
  agencyCode: string,
  payload: CreateBookingPayload
): Promise<AgencyBooking> {
  return apiRequest<AgencyBooking>(`${base(agencyCode)}/bookings`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/**
 * One-way lifecycle move: PENDING/CONFIRMED → CANCELLED, releasing the
 * reserved seats. The backend contract reads an omitted reason exactly like a
 * stored `null`, so the body is always the object `{ reason }`.
 */
export function cancelBooking(
  agencyCode: string,
  bookingCode: string,
  reason: string | null
): Promise<AgencyBooking> {
  return apiRequest<AgencyBooking>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) }
  )
}

/** The booking's traveler records, newest first. Readable at any lifecycle point. */
export function listTravelers(
  agencyCode: string,
  bookingCode: string
): Promise<BookingTraveler[]> {
  return apiRequest<BookingTraveler[]>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/travelers`
  )
}

/**
 * Adds one named seat to a PENDING booking. The backend generates the
 * `TRV-...` code and enforces the manifest cap (`reservedSeats`) and the
 * PENDING-only write rule.
 */
export function addTraveler(
  agencyCode: string,
  bookingCode: string,
  payload: TravelerWritePayload
): Promise<BookingTraveler> {
  return apiRequest<BookingTraveler>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/travelers`,
    { method: "POST", body: JSON.stringify(payload) }
  )
}

/**
 * Corrects one traveler's record while the booking is still PENDING. A blank
 * field is sent as `null`, clearing the stored value.
 */
export function updateTraveler(
  agencyCode: string,
  bookingCode: string,
  travelerCode: string,
  payload: TravelerWritePayload
): Promise<BookingTraveler> {
  return apiRequest<BookingTraveler>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/travelers/${encodeURIComponent(travelerCode)}`,
    { method: "PATCH", body: JSON.stringify(payload) }
  )
}

/**
 * One-way PENDING → CONFIRMED. No body: the backend validates the traveler
 * manifest against `reservedSeats` under a booking row lock, so a partial
 * manifest is refused with `BOOKING_TRAVELER_COUNT_MISMATCH`.
 */
export function confirmBooking(
  agencyCode: string,
  bookingCode: string
): Promise<AgencyBooking> {
  return apiRequest<AgencyBooking>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/confirm`,
    { method: "POST" }
  )
}