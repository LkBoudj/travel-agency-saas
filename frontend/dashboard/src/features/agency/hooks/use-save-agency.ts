import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { appToastManager } from "@/components/ui/toast"
import { saveAgency } from "../api/agency.api"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { AGENCY_QUERY_KEY } from "./use-agency"

/**
 * Persists an agency section patch. The mutation's canonical response is
 * written straight to the query cache (queryClient.setQueryData) so consumers
 * re-read the exact persisted record — never a locally-merged guess.
 * Other sections keep their unsaved values because resync effects only fire
 * when a form is clean.
 */
export function useSaveAgency() {
  const queryClient = useQueryClient()

  const mutation = useMutation<Agency, Error, AgencyPatch>({
    mutationFn: async (patch: AgencyPatch): Promise<Agency> => saveAgency(patch),
    onSuccess: (canonical) => {
      queryClient.setQueryData(AGENCY_QUERY_KEY, canonical)
    },
  })

  const save = useCallback(
    async (patch: AgencyPatch, successTitle: string): Promise<Agency> => {
      const canonical = await mutation.mutateAsync(patch)
      appToastManager.add({ title: successTitle })
      return canonical
    },
    [mutation]
  )

  return { save, isSaving: mutation.isPending }
}