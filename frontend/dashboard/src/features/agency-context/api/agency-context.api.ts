import { apiRequest } from "@/lib/api"
import type { AgencyContext, MyAgency } from "../types/agency-context.types"

export const myAgenciesQueryKey = ["me", "agencies"] as const

export function agencyContextQueryKey(agencyCode: string) {
  return ["agency-context", agencyCode] as const
}

/** The agencies the signed-in user belongs to. Authenticated only. */
export function getMyAgencies(): Promise<MyAgency[]> {
  return apiRequest<MyAgency[]>("/v1/me/agencies")
}

/** The caller's context inside one agency, including effective permissions. */
export function getAgencyContext(agencyCode: string): Promise<AgencyContext> {
  return apiRequest<AgencyContext>(
    `/v1/agencies/${encodeURIComponent(agencyCode)}/me`
  )
}
