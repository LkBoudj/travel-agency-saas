import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createPlatformUser,
  platformUsersRootQueryKey,
  type PlatformUserCreateInput,
} from "../api/platform-users.api"

export function useCreatePlatformUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PlatformUserCreateInput) => createPlatformUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformUsersRootQueryKey,
      })
    },
  })
}