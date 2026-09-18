import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  arePermissionKeysEqual,
  countSelectedInGroup,
  groupPermissionsByResource,
  normalizePermissionKeys,
  resourceLabel,
  togglePermissionKey,
} from "./permission-catalog.ts"
import type { PlatformPermission } from "../types/rbac.types.ts"

function permission(
  key: string,
  resource: string,
  name = key
): PlatformPermission {
  return {
    key,
    name,
    description: name,
    scope: "PLATFORM",
    resource,
    action: key.split("_").at(-1) ?? "",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}

describe("groupPermissionsByResource", () => {
  it("groups permissions by resource in the platform order", () => {
    const groups = groupPermissionsByResource([
      permission("PLATFORM_USER_ROLE_MANAGE", "USER_ROLE"),
      permission("PLATFORM_USER_VIEW", "USER"),
      permission("PLATFORM_ROLE_VIEW", "ROLE"),
      permission("PLATFORM_USER_CREATE", "USER"),
    ])

    assert.deepEqual(
      groups.map((group) => group.resource),
      ["USER", "ROLE", "USER_ROLE"]
    )
    assert.deepEqual(
      groups[0].permissions.map((entry) => entry.key),
      ["PLATFORM_USER_CREATE", "PLATFORM_USER_VIEW"]
    )
  })

  it("uses friendly labels and appends unknown resources last", () => {
    const groups = groupPermissionsByResource([
      permission("CUSTOM_THING_VIEW", "CUSTOM_THING"),
      permission("PLATFORM_ROLE_VIEW", "ROLE"),
      permission("PLATFORM_ROLE_PERMISSION_MANAGE", "ROLE_PERMISSION"),
    ])

    assert.deepEqual(
      groups.map((group) => group.resource),
      ["ROLE", "ROLE_PERMISSION", "CUSTOM_THING"]
    )
    assert.equal(groups[0].label, "Roles")
    assert.equal(groups[1].label, "Role Permissions")
    assert.equal(groups[2].label, "Custom Thing")
  })

  it("returns an empty list for an empty catalog", () => {
    assert.deepEqual(groupPermissionsByResource([]), [])
  })
})

describe("resourceLabel", () => {
  it("returns known labels and humanizes unknown resources", () => {
    assert.equal(resourceLabel("USER"), "Users")
    assert.equal(resourceLabel("USER_ROLE"), "User Roles")
    assert.equal(resourceLabel("SOMETHING_NEW"), "Something New")
    assert.equal(resourceLabel(""), "Other")
  })
})

describe("normalizePermissionKeys", () => {
  it("dedupes and sorts without mutating the input", () => {
    const input = ["B", "A", "B", "C", "A"]
    const result = normalizePermissionKeys(input)

    assert.deepEqual(result, ["A", "B", "C"])
    assert.deepEqual(input, ["B", "A", "B", "C", "A"])
  })
})

describe("arePermissionKeysEqual", () => {
  it("compares selections regardless of order or duplicates", () => {
    assert.equal(
      arePermissionKeysEqual(["A", "B", "B"], ["B", "A"]),
      true
    )
    assert.equal(arePermissionKeysEqual(["A"], ["A", "B"]), false)
    assert.equal(arePermissionKeysEqual([], []), true)
    assert.equal(arePermissionKeysEqual([], ["A"]), false)
  })
})

describe("togglePermissionKey", () => {
  it("adds a key and keeps the result normalized", () => {
    assert.deepEqual(togglePermissionKey(["B"], "A", true), ["A", "B"])
  })

  it("removes a key and is idempotent", () => {
    assert.deepEqual(togglePermissionKey(["A", "B"], "A", false), ["B"])
    assert.deepEqual(togglePermissionKey(["A", "B"], "A", false), ["B"])
    assert.deepEqual(togglePermissionKey(["A", "B"], "C", false), ["A", "B"])
  })

  it("does not duplicate an already selected key", () => {
    assert.deepEqual(togglePermissionKey(["A"], "A", true), ["A"])
  })
})

describe("countSelectedInGroup", () => {
  it("counts only the keys inside the group", () => {
    const group = {
      resource: "USER",
      label: "Users",
      permissions: [
        permission("PLATFORM_USER_VIEW", "USER"),
        permission("PLATFORM_USER_CREATE", "USER"),
      ],
    }

    assert.equal(countSelectedInGroup(group, ["PLATFORM_USER_VIEW"]), 1)
    assert.equal(
      countSelectedInGroup(group, [
        "PLATFORM_USER_VIEW",
        "PLATFORM_ROLE_VIEW",
      ]),
      1
    )
    assert.equal(countSelectedInGroup(group, []), 0)
  })
})
