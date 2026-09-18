import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  platformUserQueryKey,
  platformUsersRootQueryKey,
  setPlatformUserStatus,
} from "../api/platform-users.api"
import type {
  PlatformUser,
  PlatformUserStatus,
} from "../types/platform-user.types"

export function useSetPlatformUserStatus(code: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: PlatformUserStatus) =>
      setPlatformUserStatus(code, status),
    onSuccess: async (user: PlatformUser) => {
      queryClient.setQueryData(platformUserQueryKey(user.code), user)
      await queryClient.invalidateQueries({
        queryKey: platformUsersRootQueryKey,
      })
    },
  })
}