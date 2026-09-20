import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  agenciesRootQueryKey,
  agencyQueryKey,
  updateAgency,
  type AgencyUpdateInput,
} from "../api/agencies.api"
import type { AgencyDetails } from "../types/agency.types"

export function useUpdateAgency(code: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AgencyUpdateInput) => updateAgency(code, input),
    onSuccess: async (agency: AgencyDetails) => {
      // The backend response is the source of truth for the updated agency.
      queryClient.setQueryData(agencyQueryKey(agency.code), agency)
      await queryClient.invalidateQueries({ queryKey: agenciesRootQueryKey })
    },
  })
}
