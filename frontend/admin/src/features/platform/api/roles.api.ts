import { apiRequest } from "@/lib/api"
import type {
  PlatformRole,
  ReplaceRolePermissionsResponse,
} from "../types/rbac.types"

export const ROLES_QUERY_KEY = ["rbac", "roles"] as const

export function roleQueryKey(roleId: string) {
  return ["rbac", "roles", roleId] as const
}

export function rolePermissionsQueryKey(roleId: string) {
  return ["rbac", "roles", roleId, "permissions"] as const
}

export type RoleWriteInput = {
  name: string
  description: string | null
}

export function getRoles(): Promise<PlatformRole[]> {
  return apiRequest<PlatformRole[]>("/v1/roles")
}

export function getRole(roleId: string): Promise<PlatformRole> {
  return apiRequest<PlatformRole>(`/v1/roles/${encodeURIComponent(roleId)}`)
}

export function createRole(input: RoleWriteInput): Promise<PlatformRole> {
  return apiRequest<PlatformRole>("/v1/roles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateRole(
  roleId: string,
  input: RoleWriteInput
): Promise<PlatformRole> {
  return apiRequest<PlatformRole>(`/v1/roles/${encodeURIComponent(roleId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function deleteRole(roleId: string): Promise<void> {
  return apiRequest<void>(`/v1/roles/${encodeURIComponent(roleId)}`, {
    method: "DELETE",
  })
}

export function getRolePermissions(roleId: string): Promise<string[]> {
  return apiRequest<string[]>(
    `/v1/roles/${encodeURIComponent(roleId)}/permissions`
  )
}

export function replaceRolePermissions(
  roleId: string,
  permissionKeys: string[]
): Promise<ReplaceRolePermissionsResponse> {
  return apiRequest<ReplaceRolePermissionsResponse>(
    `/v1/roles/${encodeURIComponent(roleId)}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ permissionKeys }),
    }
  )
}
