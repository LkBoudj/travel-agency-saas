import { apiRequest } from "@/lib/api"
import type {
  Agency,
  AgencyDetails,
  AgencyStatus,
} from "../types/agency.types"

const AGENCIES_PATH = "/v1/agencies"

/**
 * Prefix shared by every agencies query key. Invalidating the root refreshes
 * filtered lists and single-agency caches in one shot.
 */
export const agenciesRootQueryKey = ["agencies"] as const

export function agenciesQueryKey(search: string, status: AgencyStatus | "ALL") {
  return [...agenciesRootQueryKey, "list", search, status] as const
}

export function agencyQueryKey(code: string) {
  return [...agenciesRootQueryKey, "agency", code] as const
}

/**
 * The owner of the agency being created, discriminated on `type`.
 *
 * EXISTING points at an account already on the platform; NEW has the backend
 * create the account in the same transaction as the agency. Ownership internals
 * (membership type, canonical system role, role ids) are backend concerns and
 * are never part of this payload.
 */
export type AgencyOwnerInput =
  | { type: "EXISTING"; appUserCode: string }
  | {
      type: "NEW"
      email: string
      password: string
      firstName: string | null
      lastName: string | null
    }

/** Create payload for `POST /v1/agencies`. */
export type AgencyCreateInput = {
  name: string
  owner: AgencyOwnerInput
  country: string | null
  description: string | null
}

/**
 * Patch payload for `PATCH /v1/agencies/:code`. Descriptive fields only —
 * status has its own endpoint and ownership is never editable here.
 */
export type AgencyUpdateInput = {
  name?: string
  country?: string | null
  description?: string | null
}

function agencyPath(code: string): string {
  return `${AGENCIES_PATH}/${encodeURIComponent(code)}`
}

export function getAgencies(
  search: string,
  status: AgencyStatus | "ALL"
): Promise<Agency[]> {
  const params = new URLSearchParams()
  const trimmed = search.trim()
  if (trimmed.length > 0) {
    params.set("search", trimmed)
  }
  if (status !== "ALL") {
    params.set("status", status)
  }
  const query = params.size > 0 ? `?${params.toString()}` : ""
  return apiRequest<Agency[]>(`${AGENCIES_PATH}${query}`)
}

export function getAgency(code: string): Promise<AgencyDetails> {
  return apiRequest<AgencyDetails>(agencyPath(code))
}

export function createAgency(input: AgencyCreateInput): Promise<AgencyDetails> {
  return apiRequest<AgencyDetails>(AGENCIES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateAgency(
  code: string,
  input: AgencyUpdateInput
): Promise<AgencyDetails> {
  return apiRequest<AgencyDetails>(agencyPath(code), {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

/**
 * Suspends or reactivates the BUSINESS. The request body carries the agency
 * status and nothing else: the client never touches membership state.
 */
export function setAgencyStatus(
  code: string,
  status: AgencyStatus
): Promise<AgencyDetails> {
  return apiRequest<AgencyDetails>(`${agencyPath(code)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}
