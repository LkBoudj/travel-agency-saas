import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  platformUserQueryKey,
  platformUsersRootQueryKey,
  replacePlatformUserRoles,
} from "../api/platform-users.api"
import type { PlatformUser } from "../types/platform-user.types"

export function useReplacePlatformUserRoles(code: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleKeys: string[]) => replacePlatformUserRoles(code, roleKeys),
    onSuccess: async (result) => {
      queryClient.setQueryData(platformUserQueryKey(result.code), (current) => {
        if (!current) {
          return current
        }
        return { ...(current as PlatformUser), roles: result.roles }
      })
      await queryClient.invalidateQueries({
        queryKey: platformUsersRootQueryKey,
      })
    },
  })
}