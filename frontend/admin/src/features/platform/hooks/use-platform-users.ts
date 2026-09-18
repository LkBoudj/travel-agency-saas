import { useQuery } from "@tanstack/react-query"

import {
  getPlatformUsers,
  platformUsersQueryKey,
} from "../api/platform-users.api"

export function usePlatformUsers(search: string) {
  return useQuery({
    queryKey: platformUsersQueryKey(search),
    queryFn: () => getPlatformUsers(search),
  })
}