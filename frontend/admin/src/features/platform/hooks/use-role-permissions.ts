import { useQuery } from "@tanstack/react-query"

import { getRolePermissions, rolePermissionsQueryKey } from "../api/roles.api"

export function useRolePermissions(roleId: string, enabled = true) {
  return useQuery({
    queryKey: rolePermissionsQueryKey(roleId),
    queryFn: () => getRolePermissions(roleId),
    enabled: enabled && roleId.length > 0,
  })
}
