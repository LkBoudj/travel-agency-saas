import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"
import { AUTH_QUERY_KEY } from "@/features/auth/api/auth.api"

/**
 * Re-validates the session when a request fails with 401 so the auth guard can
 * redirect to the login screen. The client never inspects or stores the token
 * itself; it only reacts to the status code.
 */
export function useSessionExpiryRedirect() {
  const queryClient = useQueryClient()

  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
        return true
      }
      return false
    },
    [queryClient]
  )
}
