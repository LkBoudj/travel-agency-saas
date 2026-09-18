import { useQuery } from "@tanstack/react-query"

import { getRolePermissions, rolePermissionsQueryKey } from "../api/roles.api"
import type { RoleScope } from "../types/rbac.types"

export function useRolePermissions(
  scope: RoleScope,
  roleId: string,
  enabled = true
) {
  return useQuery({
    queryKey: rolePermissionsQueryKey(scope, roleId),
    queryFn: () => getRolePermissions(scope, roleId),
    enabled: enabled && roleId.length > 0,
  })
}
