import { apiRequest } from "@/lib/api"
import type {
  PlatformRole,
  ReplaceRolePermissionsResponse,
  RoleScope,
} from "../types/rbac.types"

/**
 * Scope determines the endpoint. The client never sends `scope` or `agencyId`
 * in a request body; the backend derives them from the chosen collection.
 */
function rolesPath(scope: RoleScope): string {
  return scope === "PLATFORM" ? "/v1/roles" : "/v1/agency-roles"
}

function rolePath(scope: RoleScope, roleId: string): string {
  return `${rolesPath(scope)}/${encodeURIComponent(roleId)}`
}

export function rolesQueryKey(scope: RoleScope) {
  return ["rbac", "roles", scope] as const
}

export function roleQueryKey(scope: RoleScope, roleId: string) {
  return ["rbac", "roles", scope, roleId] as const
}

export function rolePermissionsQueryKey(scope: RoleScope, roleId: string) {
  return ["rbac", "roles", scope, roleId, "permissions"] as const
}

export type RoleCreateInput = {
  key: string
  name: string
  description: string | null
}

export type RoleUpdateInput = {
  name: string
  description: string | null
}

export function getRoles(scope: RoleScope): Promise<PlatformRole[]> {
  return apiRequest<PlatformRole[]>(rolesPath(scope))
}

export function getRole(scope: RoleScope, roleId: string): Promise<PlatformRole> {
  return apiRequest<PlatformRole>(rolePath(scope, roleId))
}

export function createRole(
  scope: RoleScope,
  input: RoleCreateInput
): Promise<PlatformRole> {
  return apiRequest<PlatformRole>(rolesPath(scope), {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateRole(
  scope: RoleScope,
  roleId: string,
  input: RoleUpdateInput
): Promise<PlatformRole> {
  return apiRequest<PlatformRole>(rolePath(scope, roleId), {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function deleteRole(scope: RoleScope, roleId: string): Promise<void> {
  return apiRequest<void>(rolePath(scope, roleId), {
    method: "DELETE",
  })
}

export function getRolePermissions(
  scope: RoleScope,
  roleId: string
): Promise<string[]> {
  return apiRequest<string[]>(`${rolePath(scope, roleId)}/permissions`)
}

export function replaceRolePermissions(
  scope: RoleScope,
  roleId: string,
  permissionKeys: string[]
): Promise<ReplaceRolePermissionsResponse> {
  return apiRequest<ReplaceRolePermissionsResponse>(
    `${rolePath(scope, roleId)}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ permissionKeys }),
    }
  )
}
