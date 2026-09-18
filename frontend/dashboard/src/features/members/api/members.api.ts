import { apiRequest } from "@/lib/api"
import type {
  AddMemberPayload,
  AgencyMember,
  AssignableRole,
  MemberCandidate,
  ReplaceRolesPayload,
  SetMemberStatusPayload,
} from "../types/members.types"

/**
 * Query keys.
 *
 * Every key starts with the agency code, so two tabs in two agencies keep
 * separate caches and a mutation in one can never invalidate the other's data.
 */
export const membersQueryKeys = {
  all: (agencyCode: string) => ["agency", agencyCode, "members"] as const,
  list: (agencyCode: string, search: string) =>
    ["agency", agencyCode, "members", "list", search] as const,
  detail: (agencyCode: string, userCode: string) =>
    ["agency", agencyCode, "members", "detail", userCode] as const,
  candidates: (agencyCode: string, search: string) =>
    ["agency", agencyCode, "member-candidates", search] as const,
  assignableRoles: (agencyCode: string) =>
    ["agency", agencyCode, "available-roles"] as const,
}

function base(agencyCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}`
}

export function listMembers(
  agencyCode: string,
  search: string
): Promise<AgencyMember[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  return apiRequest<AgencyMember[]>(`${base(agencyCode)}/members${query}`)
}

export function getMember(
  agencyCode: string,
  userCode: string
): Promise<AgencyMember> {
  return apiRequest<AgencyMember>(
    `${base(agencyCode)}/members/${encodeURIComponent(userCode)}`
  )
}

/** Requires AGENCY_MEMBER_INVITE, and a search term of at least 2 characters. */
export function listMemberCandidates(
  agencyCode: string,
  search: string
): Promise<MemberCandidate[]> {
  return apiRequest<MemberCandidate[]>(
    `${base(agencyCode)}/member-candidates?search=${encodeURIComponent(search.trim())}`
  )
}

/** Requires AGENCY_MEMBER_ROLE_MANAGE. */
export function listAssignableRoles(
  agencyCode: string
): Promise<AssignableRole[]> {
  return apiRequest<AssignableRole[]>(`${base(agencyCode)}/available-roles`)
}

export function addMember(
  agencyCode: string,
  payload: AddMemberPayload
): Promise<AgencyMember> {
  return apiRequest<AgencyMember>(`${base(agencyCode)}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Complete replacement of the member's roles. */
export function replaceMemberRoles(
  agencyCode: string,
  userCode: string,
  payload: ReplaceRolesPayload
): Promise<AgencyMember> {
  return apiRequest<AgencyMember>(
    `${base(agencyCode)}/members/${encodeURIComponent(userCode)}/roles`,
    { method: "PUT", body: JSON.stringify(payload) }
  )
}

/** Access to THIS agency only; the account itself is untouched. */
export function setMemberStatus(
  agencyCode: string,
  userCode: string,
  payload: SetMemberStatusPayload
): Promise<AgencyMember> {
  return apiRequest<AgencyMember>(
    `${base(agencyCode)}/members/${encodeURIComponent(userCode)}/status`,
    { method: "PATCH", body: JSON.stringify(payload) }
  )
}

/** Removes the membership. The account is never deleted. Responds 204. */
export function removeMember(
  agencyCode: string,
  userCode: string
): Promise<void> {
  return apiRequest<void>(
    `${base(agencyCode)}/members/${encodeURIComponent(userCode)}`,
    { method: "DELETE" }
  )
}
