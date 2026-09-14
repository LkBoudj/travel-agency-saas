import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { getAgency } from "../api/agency.api"
import { computeAgencyPublicProfileReadiness } from "../domain/agency-readiness"
import type { Agency } from "../types/agency.types"

export const AGENCY_QUERY_KEY = ["agency", "profile"] as const

/**
 * Reads the canonical Agency record (single dev boundary shared with onboarding).
 * staleTime: Infinity — the canonical record only changes through section-save
 * mutations (setQueryData); a background refetch must never silently redefine
 * a dirty form.
 */
export function useAgency() {
  const { data, isLoading, error } = useQuery({
    queryKey: AGENCY_QUERY_KEY,
    queryFn: async (): Promise<Agency> => getAgency(),
    staleTime: Infinity,
  })

  const readiness = useMemo(
    () => (data ? computeAgencyPublicProfileReadiness(data) : null),
    [data]
  )

  return { agency: data ?? null, isLoading, error, readiness }
}