import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { bookingsQueryKeys, listTravelers } from "../api/bookings.api"

/**
 * The booking's traveler records, newest first. The manifest is readable at
 * any point in the booking lifecycle — after confirmation it IS the recorded
 * ticket manifest, after cancellation the historical one.
 */
export function useTravelers(
  agencyCode: string,
  bookingCode: string | undefined
) {
  return useQuery({
    queryKey: bookingsQueryKeys.travelers(agencyCode, bookingCode ?? ""),
    queryFn: () => listTravelers(agencyCode, bookingCode ?? ""),
    enabled: Boolean(bookingCode) && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
  })
}