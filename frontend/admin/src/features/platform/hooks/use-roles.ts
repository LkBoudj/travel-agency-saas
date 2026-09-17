import { useQuery } from "@tanstack/react-query"

import { ROLES_QUERY_KEY, getRoles } from "../api/roles.api"

export function useRoles() {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: getRoles,
  })
}
