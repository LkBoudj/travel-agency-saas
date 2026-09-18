import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  agenciesRootQueryKey,
  agencyQueryKey,
  setAgencyStatus,
} from "../api/agencies.api"
import type { AgencyDetails, AgencyStatus } from "../types/agency.types"

/**
 * Suspends or reactivates the agency itself. Membership state is never part of
 * this mutation: the owner stays ACTIVE while the agency is SUSPENDED.
 */
export function useSetAgencyStatus(code: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: AgencyStatus) => setAgencyStatus(code, status),
    onSuccess: async (agency: AgencyDetails) => {
      queryClient.setQueryData(agencyQueryKey(agency.code), agency)
      await queryClient.invalidateQueries({ queryKey: agenciesRootQueryKey })
    },
  })
}
