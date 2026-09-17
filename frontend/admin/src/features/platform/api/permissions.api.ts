import { apiRequest } from "@/lib/api"
import type { PlatformPermission } from "../types/rbac.types"

export const AVAILABLE_PERMISSIONS_QUERY_KEY = [
  "rbac",
  "permissions",
  "available",
] as const

/**
 * Returns the code-owned platform permission catalog exposed for role
 * assignment. The list is the single source for the permission UI; the client
 * never hardcodes a second catalog.
 */
export function getAvailablePermissions(): Promise<PlatformPermission[]> {
  return apiRequest<PlatformPermission[]>("/v1/roles/available-permissions")
}
