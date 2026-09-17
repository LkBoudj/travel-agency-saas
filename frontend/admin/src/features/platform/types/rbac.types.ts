export type PermissionResource =
  | "USER"
  | "ROLE"
  | "ROLE_PERMISSION"
  | "USER_ROLE"

/**
 * Platform role as returned by the RBAC API. `id` is a serialized BigInt and
 * must be treated as an opaque string; the backend owns the role scope.
 */
export type PlatformRole = {
  id: string
  name: string
  scope: string
  description: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Code-owned platform permission. `key` is the only identifier the client may
 * send back; database ids are never exposed through this surface.
 */
export type PlatformPermission = {
  key: string
  name: string
  description: string | null
  scope: string
  resource: string
  action: string
  createdAt: string
}

export type ReplaceRolePermissionsResponse = {
  roleId: string
  permissionKeys: string[]
}
