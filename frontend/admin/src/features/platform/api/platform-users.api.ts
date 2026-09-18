import { apiRequest } from "@/lib/api"
import type {
  PlatformUser,
  PlatformUserRoleRef,
  PlatformUserStatus,
} from "../types/platform-user.types"

const PLATFORM_USERS_PATH = "/v1/platform-users"

/**
 * Prefix shared by every platform-users query key. Invalidating the root
 * refreshes searched lists and single-user caches in one shot.
 */
export const platformUsersRootQueryKey = ["platform-users"] as const

export function platformUsersQueryKey(search: string) {
  return [...platformUsersRootQueryKey, "list", search] as const
}

export function platformUserQueryKey(code: string) {
  return [...platformUsersRootQueryKey, "user", code] as const
}

export type PlatformUserCreateInput = {
  email: string
  password: string
  firstName: string | null
  lastName: string | null
  roleKeys: string[]
}

export type PlatformUserUpdateInput = {
  email?: string
  firstName?: string | null
  lastName?: string | null
}

export type ReplacePlatformUserRolesResponse = {
  code: string
  roles: PlatformUserRoleRef[]
}

function platformUserPath(code: string): string {
  return `${PLATFORM_USERS_PATH}/${encodeURIComponent(code)}`
}

export function getPlatformUsers(search: string): Promise<PlatformUser[]> {
  const trimmed = search.trim()
  const query =
    trimmed.length > 0 ? `?search=${encodeURIComponent(trimmed)}` : ""
  return apiRequest<PlatformUser[]>(`${PLATFORM_USERS_PATH}${query}`)
}

export function getPlatformUser(code: string): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(platformUserPath(code))
}

export function createPlatformUser(
  input: PlatformUserCreateInput
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(PLATFORM_USERS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updatePlatformUser(
  code: string,
  input: PlatformUserUpdateInput
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(platformUserPath(code), {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function setPlatformUserStatus(
  code: string,
  status: PlatformUserStatus
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(`${platformUserPath(code)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export function replacePlatformUserRoles(
  code: string,
  roleKeys: string[]
): Promise<ReplacePlatformUserRolesResponse> {
  return apiRequest<ReplacePlatformUserRolesResponse>(
    `${platformUserPath(code)}/roles`,
    {
      method: "PUT",
      body: JSON.stringify({ roleKeys }),
    }
  )
}