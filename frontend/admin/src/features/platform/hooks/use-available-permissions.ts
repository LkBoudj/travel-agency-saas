import { useQuery } from "@tanstack/react-query"

import {
  AVAILABLE_PERMISSIONS_QUERY_KEY,
  getAvailablePermissions,
} from "../api/permissions.api"

export function useAvailablePermissions() {
  return useQuery({
    queryKey: AVAILABLE_PERMISSIONS_QUERY_KEY,
    queryFn: getAvailablePermissions,
    staleTime: 5 * 60_000,
  })
}
