import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  roleQueryKey,
  rolesQueryKey,
  updateRole,
  type RoleUpdateInput,
} from "../api/roles.api"
import type { PlatformRole, RoleScope } from "../types/rbac.types"

export function useUpdateRole(scope: RoleScope, roleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RoleUpdateInput) => updateRole(scope, roleId, input),
    onSuccess: async (role: PlatformRole) => {
      queryClient.setQueryData(roleQueryKey(scope, roleId), role)
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey(scope) })
    },
  })
}
