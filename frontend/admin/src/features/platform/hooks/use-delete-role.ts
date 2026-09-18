import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteRole, roleQueryKey, rolesQueryKey } from "../api/roles.api"
import type { RoleScope } from "../types/rbac.types"

export function useDeleteRole(scope: RoleScope) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(scope, roleId),
    onSuccess: async (_data, roleId) => {
      queryClient.removeQueries({ queryKey: roleQueryKey(scope, roleId) })
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey(scope) })
    },
  })
}
