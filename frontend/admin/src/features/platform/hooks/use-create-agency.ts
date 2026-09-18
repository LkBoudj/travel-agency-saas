import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  agenciesRootQueryKey,
  createAgency,
  type AgencyCreateInput,
} from "../api/agencies.api"

export function useCreateAgency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AgencyCreateInput) => createAgency(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agenciesRootQueryKey })
    },
  })
}
