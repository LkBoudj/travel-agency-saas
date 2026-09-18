export type PermissionResource =
  | "USER"
  | "ROLE"
  | "ROLE_PERMISSION"
  | "USER_ROLE"

/**
 * Role scope owned by the backend. `PLATFORM` roles govern platform users;
 * `AGENCY` roles govern agency users. The client never sends a scope on role
 * writes: it selects the correct endpoint instead.
 */
export type RoleScope = "PLATFORM" | "AGENCY"

/**
 * Role as returned by the RBAC API. `id` is a serialized BigInt and must be
 * treated as an opaque string. `key` is the immutable technical identifier;
 * `name` is the human-readable display name.
 */
export type PlatformRole = {
  id: string
  name: string
  key: string
  scope: RoleScope
  description: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Code-owned permission. `key` is the only identifier the client may send
 * back; database ids are never exposed through this surface.
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
