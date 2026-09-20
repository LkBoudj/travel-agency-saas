import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { listAssignableRoles, membersQueryKeys } from "../api/members.api"

/**
 * Roles assignable in THIS agency.
 *
 * Gated on AGENCY_MEMBER_ROLE_MANAGE by the caller, because that is what the
 * backend route requires: fetching it without the permission would produce a
 * guaranteed 403 and an error where no control should have appeared.
 */
export function useAssignableRoles(agencyCode: string, enabled: boolean) {
  return useQuery({
    queryKey: membersQueryKeys.assignableRoles(agencyCode),
    queryFn: () => listAssignableRoles(agencyCode),
    enabled: enabled && agencyCode.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
}
