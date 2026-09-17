import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  replaceRolePermissions,
  rolePermissionsQueryKey,
} from "../api/roles.api"

export function useReplaceRolePermissions(roleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (permissionKeys: string[]) =>
      replaceRolePermissions(roleId, permissionKeys),
    onSuccess: (result) => {
      queryClient.setQueryData(
        rolePermissionsQueryKey(roleId),
        result.permissionKeys
      )
    },
  })
}
