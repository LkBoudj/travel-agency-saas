import { useQuery } from "@tanstack/react-query"

import { AUTH_QUERY_KEY, getCurrentUser } from "../api/auth.api"

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
  })
}