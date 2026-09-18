import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { listMembers, membersQueryKeys } from "../api/members.api"

/**
 * The member list for one agency, filtered by the backend.
 *
 * Searching is a server concern here: filtering a partial client list would
 * quietly hide people the server would have matched.
 */
export function useMembers(agencyCode: string, search: string, enabled = true) {
  return useQuery({
    queryKey: membersQueryKeys.list(agencyCode, search.trim()),
    queryFn: () => listMembers(agencyCode, search),
    enabled: enabled && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
    placeholderData: (previous) => previous,
  })
}
