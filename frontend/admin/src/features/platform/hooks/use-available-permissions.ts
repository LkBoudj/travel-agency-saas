import { useQuery } from "@tanstack/react-query"

import {
  availablePermissionsQueryKey,
  getAvailablePermissions,
} from "../api/permissions.api"
import type { RoleScope } from "../types/rbac.types"

export function useAvailablePermissions(scope: RoleScope) {
  return useQuery({
    queryKey: availablePermissionsQueryKey(scope),
    queryFn: () => getAvailablePermissions(scope),
    staleTime: 5 * 60_000,
  })
}
