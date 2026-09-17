import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  ROLES_QUERY_KEY,
  deleteRole,
  roleQueryKey,
} from "../api/roles.api"

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: async (_data, roleId) => {
      queryClient.removeQueries({ queryKey: roleQueryKey(roleId) })
      await queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY })
    },
  })
}
