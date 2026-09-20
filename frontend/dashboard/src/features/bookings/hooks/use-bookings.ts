import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import {
  bookingsQueryKeys,
  listBookings,
} from "../api/bookings.api"
import type { BookingStatus } from "../types/bookings.types"

/**
 * The booking list for one agency, filtered by the backend.
 *
 * Searching and status-filtering are server concerns here: filtering a partial
 * client list would quietly hide bookings the server would have matched. The
 * backend returns every status; cancelled ones stay listed so their history is
 * reachable.
 */
export function useBookings(
  agencyCode: string,
  search: string,
  status: BookingStatus | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: bookingsQueryKeys.list(agencyCode, search.trim(), status),
    queryFn: () => listBookings(agencyCode, search, status),
    enabled: enabled && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
    placeholderData: (previous) => previous,
  })
}