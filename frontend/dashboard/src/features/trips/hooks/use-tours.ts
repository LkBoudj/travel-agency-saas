import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { listTours, toursQueryKeys } from "../api/tours.api"
import type { TourStatus } from "../types/tour.types"

/**
 * The tour list for one agency, filtered by the backend.
 *
 * Search and status are server concerns: filtering a partial client list would
 * quietly hide tours the server would have matched. The list excludes ARCHIVED
 * tours unless the caller asks for them; archived rows stay readable by code
 * from the editor.
 */
export function useTours(
  agencyCode: string,
  search: string,
  status?: TourStatus,
  enabled = true
) {
  return useQuery({
    queryKey: toursQueryKeys.list(agencyCode, search.trim(), status),
    queryFn: () => listTours(agencyCode, search, status),
    enabled: enabled && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
    placeholderData: (previous) => previous,
  })
}