import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ROLES_QUERY_KEY, createRole, type RoleWriteInput } from "../api/roles.api"

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RoleWriteInput) => createRole(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY })
    },
  })
}
