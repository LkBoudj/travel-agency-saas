import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildReplaceRolesPayload,
  buildSetStatusPayload,
  normalizeRoleKeys,
  reactivatePayload,
  suspendPayload,
} from "./member-payloads.ts"

describe("role keys", () => {
  it("drops blanks and duplicates", () => {
    assert.deepEqual(normalizeRoleKeys(["A", " A ", "", "  ", "B"]), ["A", "B"])
  })

  it("keeps an empty list empty", () => {
    assert.deepEqual(normalizeRoleKeys([]), [])
  })
})

describe("replace roles payload", () => {
  it("sends only roleKeys, as a complete replacement", () => {
    assert.deepEqual(buildReplaceRolesPayload(["A", "B"]), {
      roleKeys: ["A", "B"],
    })
  })

  it("allows clearing every role", () => {
    assert.deepEqual(buildReplaceRolesPayload([]), { roleKeys: [] })
  })
})

describe("status payloads", () => {
  it("suspends and reactivates through the same field", () => {
    assert.deepEqual(suspendPayload(), { status: "SUSPENDED" })
    assert.deepEqual(reactivatePayload(), { status: "ACTIVE" })
  })

  it("sends nothing but the status", () => {
    assert.deepEqual(Object.keys(buildSetStatusPayload("ACTIVE")), ["status"])
  })
})
