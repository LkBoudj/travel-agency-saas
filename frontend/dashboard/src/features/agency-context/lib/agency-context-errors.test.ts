import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { agencyContextErrorMessage } from "./agency-context-errors.ts"

describe("agencyContextErrorMessage", () => {
  it("distinguishes the four ways an agency can be unopenable", () => {
    assert.match(agencyContextErrorMessage(404, "AGENCY_NOT_FOUND"), /does not exist/i)
    assert.match(agencyContextErrorMessage(403, "AGENCY_SUSPENDED"), /suspended/i)
    assert.match(
      agencyContextErrorMessage(403, "AGENCY_MEMBERSHIP_REQUIRED"),
      /not a member/i
    )
    assert.match(
      agencyContextErrorMessage(403, "AGENCY_MEMBERSHIP_INACTIVE"),
      /your access .* suspended/i
    )
  })

  it("explains an expired session", () => {
    assert.match(agencyContextErrorMessage(401), /session has expired/i)
  })

  it("falls back to a generic message for an unknown failure", () => {
    assert.match(agencyContextErrorMessage(500), /could not load/i)
    assert.match(agencyContextErrorMessage(undefined), /could not load/i)
  })

  it("never leaks a raw backend error code", () => {
    const codes = [
      "AGENCY_NOT_FOUND",
      "AGENCY_SUSPENDED",
      "AGENCY_MEMBERSHIP_REQUIRED",
      "AGENCY_MEMBERSHIP_INACTIVE",
    ]
    for (const code of codes) {
      const message = agencyContextErrorMessage(403, code, code)
      assert.doesNotMatch(message, /AGENCY_[A-Z_]+/)
      assert.ok(message.trim().length > 0)
    }
  })
})
