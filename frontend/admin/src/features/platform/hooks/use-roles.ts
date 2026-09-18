import { useQuery } from "@tanstack/react-query"

import { getRoles, rolesQueryKey } from "../api/roles.api"
import type { RoleScope } from "../types/rbac.types"

export function useRoles(scope: RoleScope) {
  return useQuery({
    queryKey: rolesQueryKey(scope),
    queryFn: () => getRoles(scope),
  })
}
