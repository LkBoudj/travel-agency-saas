import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { hasAgencyPermissions } from "./agency-permissions.ts"

describe("hasAgencyPermissions", () => {
  const granted = ["AGENCY_MEMBER_VIEW", "AGENCY_MEMBER_UPDATE"]

  it("is true when the single required key is granted", () => {
    assert.equal(hasAgencyPermissions(granted, ["AGENCY_MEMBER_VIEW"]), true)
  })

  it("is false when a required key is missing", () => {
    assert.equal(hasAgencyPermissions(granted, ["AGENCY_MEMBER_REMOVE"]), false)
  })

  it("requires ALL keys, matching how the backend guard evaluates them", () => {
    assert.equal(
      hasAgencyPermissions(granted, ["AGENCY_MEMBER_VIEW", "AGENCY_MEMBER_UPDATE"]),
      true
    )
    assert.equal(
      hasAgencyPermissions(granted, ["AGENCY_MEMBER_VIEW", "AGENCY_MEMBER_REMOVE"]),
      false
    )
  })

  it("is true when nothing is required", () => {
    assert.equal(hasAgencyPermissions(granted, []), true)
    assert.equal(hasAgencyPermissions([], []), true)
  })

  it("grants nothing when the member holds no permissions", () => {
    assert.equal(hasAgencyPermissions([], ["AGENCY_MEMBER_VIEW"]), false)
  })
})
