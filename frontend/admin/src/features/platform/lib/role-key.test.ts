import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ROLE_KEY_MAX_LENGTH } from "../schemas/role-form.schema.ts"
import { suggestRoleKey } from "./role-key.ts"

describe("suggestRoleKey", () => {
  it("prefixes platform role names", () => {
    assert.equal(
      suggestRoleKey("PLATFORM", "Support Manager"),
      "PLATFORM_SUPPORT_MANAGER"
    )
  })

  it("prefixes agency role names", () => {
    assert.equal(
      suggestRoleKey("AGENCY", "Booking Agent"),
      "AGENCY_BOOKING_AGENT"
    )
  })

  it("collapses punctuation and repeated separators", () => {
    assert.equal(
      suggestRoleKey("PLATFORM", "  Content -- Manager!! "),
      "PLATFORM_CONTENT_MANAGER"
    )
  })

  it("keeps digits and single underscores", () => {
    assert.equal(
      suggestRoleKey("PLATFORM", "Tier 2_Support"),
      "PLATFORM_TIER_2_SUPPORT"
    )
  })

  it("returns an empty key when no usable characters remain", () => {
    assert.equal(suggestRoleKey("AGENCY", "   "), "")
    assert.equal(suggestRoleKey("AGENCY", "---"), "")
  })

  it("respects the schema maximum key length without a trailing separator", () => {
    const key = suggestRoleKey("PLATFORM", "x".repeat(200))

    assert.equal(key.length <= ROLE_KEY_MAX_LENGTH, true)
    assert.equal(/_$/.test(key), false)
  })
})
