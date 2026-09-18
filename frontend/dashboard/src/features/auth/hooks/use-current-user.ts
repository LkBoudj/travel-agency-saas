import { useQuery } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"
import { AUTH_QUERY_KEY, getCurrentUser } from "../api/auth.api"

/**
 * The session, resolved from the server on every app load.
 *
 * A 401 is a normal answer here ("not signed in"), not a failure worth
 * retrying, so it resolves immediately instead of hanging the guards behind
 * retry backoff.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false
      return failureCount < 2
    },
    staleTime: 30_000,
  })
}
