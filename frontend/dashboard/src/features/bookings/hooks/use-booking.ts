import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { bookingsQueryKeys, getBooking } from "../api/bookings.api"

/**
 * One booking by code, with its frozen price lines and status history.
 * Cancelled bookings remain readable here, so a stored link keeps working.
 */
export function useBooking(agencyCode: string, bookingCode: string | undefined) {
  return useQuery({
    queryKey: bookingsQueryKeys.detail(agencyCode, bookingCode ?? ""),
    queryFn: () => getBooking(agencyCode, bookingCode ?? ""),
    enabled: Boolean(bookingCode) && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
  })
}