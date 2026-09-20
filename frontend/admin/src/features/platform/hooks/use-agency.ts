import { useQuery } from "@tanstack/react-query"

import { agencyQueryKey, getAgency } from "../api/agencies.api"

export function useAgency(code: string) {
  return useQuery({
    queryKey: agencyQueryKey(code),
    queryFn: () => getAgency(code),
  })
}
