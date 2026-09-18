import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  replaceRolePermissions,
  rolePermissionsQueryKey,
} from "../api/roles.api"
import type { RoleScope } from "../types/rbac.types"

export function useReplaceRolePermissions(scope: RoleScope, roleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (permissionKeys: string[]) =>
      replaceRolePermissions(scope, roleId, permissionKeys),
    onSuccess: (result) => {
      queryClient.setQueryData(
        rolePermissionsQueryKey(scope, roleId),
        result.permissionKeys
      )
    },
  })
}
