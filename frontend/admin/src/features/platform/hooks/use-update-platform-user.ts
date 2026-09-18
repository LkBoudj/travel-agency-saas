import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  platformUserQueryKey,
  platformUsersRootQueryKey,
  updatePlatformUser,
  type PlatformUserUpdateInput,
} from "../api/platform-users.api"
import type { PlatformUser } from "../types/platform-user.types"

export function useUpdatePlatformUser(code: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PlatformUserUpdateInput) =>
      updatePlatformUser(code, input),
    onSuccess: async (user: PlatformUser) => {
      queryClient.setQueryData(platformUserQueryKey(code), user)
      await queryClient.invalidateQueries({
        queryKey: platformUsersRootQueryKey,
      })
    },
  })
}