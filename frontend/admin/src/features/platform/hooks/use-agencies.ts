import { useQuery } from "@tanstack/react-query"

import { agenciesQueryKey, getAgencies } from "../api/agencies.api"
import type { AgencyStatus } from "../types/agency.types"

export function useAgencies(search: string, status: AgencyStatus | "ALL") {
  return useQuery({
    queryKey: agenciesQueryKey(search, status),
    queryFn: () => getAgencies(search, status),
  })
}
