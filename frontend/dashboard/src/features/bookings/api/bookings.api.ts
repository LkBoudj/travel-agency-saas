import { apiRequest } from "@/lib/api"
import type {
  AgencyBooking,
  BookingDetail,
  BookingStatus,
  CreateBookingPayload,
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