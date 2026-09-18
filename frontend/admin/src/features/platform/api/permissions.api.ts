import { apiRequest } from "@/lib/api"
import type { PlatformPermission, RoleScope } from "../types/rbac.types"

export function availablePermissionsQueryKey(scope: RoleScope) {
  return ["rbac", "permissions", "available", scope] as const
}

/**
 * Returns the code-owned permission catalog exposed for role assignment in the
 * given scope. The list is the single source for the permission UI; the client
 * never hardcodes a second catalog and never mixes scopes.
 */
export function getAvailablePermissions(
  scope: RoleScope
): Promise<PlatformPermission[]> {
  const path =
    scope === "PLATFORM"
      ? "/v1/roles/available-permissions"
      : "/v1/agency-roles/available-permissions"
  return apiRequest<PlatformPermission[]>(path)
}
