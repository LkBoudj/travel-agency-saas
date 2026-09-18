import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createRole,
  rolesQueryKey,
  type RoleCreateInput,
} from "../api/roles.api"
import type { RoleScope } from "../types/rbac.types"

export function useCreateRole(scope: RoleScope) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RoleCreateInput) => createRole(scope, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey(scope) })
    },
  })
}
