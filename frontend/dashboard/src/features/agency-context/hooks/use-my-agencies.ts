import { useQuery } from "@tanstack/react-query"

import { getMyAgencies, myAgenciesQueryKey } from "../api/agency-context.api"

/** The agencies the signed-in user belongs to. */
export function useMyAgencies() {
  return useQuery({
    queryKey: myAgenciesQueryKey,
    queryFn: getMyAgencies,
  })
}
