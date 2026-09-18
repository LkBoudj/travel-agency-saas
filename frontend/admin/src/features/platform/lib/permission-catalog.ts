import type { PlatformPermission } from "../types/rbac.types"

/**
 * Display labels for the platform permission resources. The backend owns the
 * permission catalog; this map only localizes the known resources for grouping
 * and falls back to a humanized version of any unknown resource.
 */
export const RESOURCE_LABELS: Record<string, string> = {
  USER: "Users",
  ROLE: "Roles",
  ROLE_PERMISSION: "Role Permissions",
  USER_ROLE: "User Roles",
}

export const RESOURCE_ORDER = ["USER", "ROLE", "ROLE_PERMISSION", "USER_ROLE"]

export type PermissionGroup = {
  resource: string
  label: string
  permissions: PlatformPermission[]
}

function humanizeResource(resource: string): string {
  const words = resource.trim().toLowerCase().split("_").filter(Boolean)
  if (words.length === 0) {
    return "Other"
  }
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? humanizeResource(resource)
}

export function groupPermissionsByResource(
  permissions: PlatformPermission[]
): PermissionGroup[] {
  const buckets = new Map<string, PlatformPermission[]>()
  for (const permission of permissions) {
    const bucket = buckets.get(permission.resource)
    if (bucket) {
      bucket.push(permission)
    } else {
      buckets.set(permission.resource, [permission])
    }
  }

  const resources = [...buckets.keys()].sort((a, b) => {
    const aIndex = RESOURCE_ORDER.indexOf(a)
    const bIndex = RESOURCE_ORDER.indexOf(b)
    const aRank = aIndex === -1 ? RESOURCE_ORDER.length : aIndex
    const bRank = bIndex === -1 ? RESOURCE_ORDER.length : bIndex
    if (aRank !== bRank) {
      return aRank - bRank
    }
    return a.localeCompare(b)
  })

  return resources.map((resource) => ({
    resource,
    label: resourceLabel(resource),
    permissions: [...(buckets.get(resource) ?? [])].sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
  }))
}

export function normalizePermissionKeys(keys: string[]): string[] {
  return [...new Set(keys)].sort()
}

export function arePermissionKeysEqual(a: string[], b: string[]): boolean {
  const left = normalizePermissionKeys(a)
  const right = normalizePermissionKeys(b)
  return (
    left.length === right.length && left.every((key, index) => key === right[index])
  )
}

export function togglePermissionKey(
  keys: string[],
  key: string,
  checked: boolean
): string[] {
  const next = new Set(keys)
  if (checked) {
    next.add(key)
  } else {
    next.delete(key)
  }
  return normalizePermissionKeys([...next])
}

export function countSelectedInGroup(
  group: PermissionGroup,
  selectedKeys: string[]
): number {
  const selected = new Set(selectedKeys)
  return group.permissions.reduce(
    (count, permission) => (selected.has(permission.key) ? count + 1 : count),
    0
  )
}
