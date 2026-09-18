import type { RoleScope } from "../types/rbac.types"

const MAX_KEY_LENGTH = 64

const SCOPE_PREFIX: Record<RoleScope, string> = {
  PLATFORM: "PLATFORM",
  AGENCY: "AGENCY",
}

/**
 * Suggests a technical key from a display name. This is a convenience only:
 * the backend scope is authoritative and is never derived from the prefix.
 */
export function suggestRoleKey(scope: RoleScope, name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (slug.length === 0) {
    return ""
  }

  return `${SCOPE_PREFIX[scope]}_${slug}`
    .slice(0, MAX_KEY_LENGTH)
    .replace(/_+$/g, "")
}
