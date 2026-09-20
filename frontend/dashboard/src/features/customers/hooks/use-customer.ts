import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { customersQueryKeys, getCustomer } from "../api/customers.api"

/**
 * One customer by code. Archived customers remain readable here, so a stored
 * link to a customer keeps working after it leaves the active listing.
 */
export function useCustomer(agencyCode: string, customerCode: string | undefined) {
  return useQuery({
    queryKey: customersQueryKeys.detail(agencyCode, customerCode ?? ""),
    queryFn: () => getCustomer(agencyCode, customerCode ?? ""),
    enabled: Boolean(customerCode) && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
  })
}