import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { customersQueryKeys, listCustomers } from "../api/customers.api"

/**
 * The customer list for one agency, filtered by the backend.
 *
 * Searching is a server concern here: filtering a partial client list would
 * quietly hide people the server would have matched. The list only ever holds
 * ACTIVE customers — archived ones are read by code from the details page.
 */
export function useCustomers(
  agencyCode: string,
  search: string,
  enabled = true
) {
  return useQuery({
    queryKey: customersQueryKeys.list(agencyCode, search.trim()),
    queryFn: () => listCustomers(agencyCode, search),
    enabled: enabled && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
    placeholderData: (previous) => previous,
  })
}