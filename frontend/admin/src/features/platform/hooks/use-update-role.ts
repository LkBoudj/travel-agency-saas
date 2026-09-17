import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  ROLES_QUERY_KEY,
  roleQueryKey,
  updateRole,
  type RoleWriteInput,
} from "../api/roles.api"
import type { PlatformRole } from "../types/rbac.types"

export function useUpdateRole(roleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RoleWriteInput) => updateRole(roleId, input),
    onSuccess: async (role: PlatformRole) => {
      queryClient.setQueryData(roleQueryKey(roleId), role)
      await queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY })
    },
  })
}
