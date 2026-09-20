import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { getTour, toursQueryKeys } from "../api/tours.api"

/**
 * One tour by code. Archived tours remain readable here, so a stored
 * `TUR-...` link keeps working after it leaves the active listing.
 */
export function useTour(
  agencyCode: string,
  tourCode: string | undefined
) {
  return useQuery({
    queryKey: toursQueryKeys.detail(agencyCode, tourCode ?? ""),
    queryFn: () => getTour(agencyCode, tourCode ?? ""),
    enabled: Boolean(tourCode) && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
  })
}