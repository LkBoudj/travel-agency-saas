import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { agencyErrorMessage } from "./agency-error-messages.ts"

describe("agencyErrorMessage", () => {
  it("explains an expired session", () => {
    assert.match(
      agencyErrorMessage("load-agency", 401),
      /session has expired/i
    )
  })

  it("explains a permission denial without naming roles", () => {
    const message = agencyErrorMessage("create-agency", 403)
    assert.match(message, /do not have permission/i)
    assert.doesNotMatch(message, /PLATFORM_|role/i)
  })

  it("explains an unknown owner code on create", () => {
    assert.match(
      agencyErrorMessage(
        "create-agency",
        404,
        "The owner account does not exist",
        "OWNER_APP_USER_NOT_FOUND"
      ),
      /No account matches that owner code/i
    )
  })

  it("explains a suspended owner account", () => {
    assert.match(
      agencyErrorMessage(
        "create-agency",
        409,
        "A suspended account cannot own an agency",
        "OWNER_APP_USER_NOT_ACTIVE"
      ),
      /suspended and cannot own an agency/i
    )
  })

  it("tells the admin to switch modes when the email already has an account", () => {
    const message = agencyErrorMessage(
      "create-agency",
      409,
      "An account with this email address already exists",
      "EMAIL_ALREADY_REGISTERED"
    )
    assert.match(message, /already exists/i)
    assert.match(message, /Existing user/i)
  })

  it("explains a generic identity conflict without leaking internals", () => {
    const message = agencyErrorMessage(
      "create-agency",
      409,
      "Could not create user",
      "USER_CREATE_CONFLICT"
    )
    assert.match(message, /could not be created/i)
    assert.doesNotMatch(message, /passwordHash|constraint|P2002/i)
  })

  it("explains a missing agency on update", () => {
    assert.match(
      agencyErrorMessage("update-agency", 404, "Agency not found", "AGENCY_NOT_FOUND"),
      /no longer exists/i
    )
  })

  it("turns catalog failures into an actionable message", () => {
    for (const [status, code] of [
      [400, "AGENCY_ADMIN_ROLE_MISSING"],
      [409, "AGENCY_ADMIN_ROLE_INVALID"],
    ] as const) {
      const message = agencyErrorMessage("create-agency", status, "raw", code)
      assert.match(message, /Contact a platform administrator/i)
      assert.doesNotMatch(message, /AGENCY_ADMIN/)
    }
  })

  it("falls back to the backend message when it is safe and specific", () => {
    assert.equal(
      agencyErrorMessage("update-agency", 400, "Agency name is too long"),
      "Agency name is too long"
    )
  })

  it("falls back to a generic message when the backend says nothing", () => {
    assert.match(
      agencyErrorMessage("set-agency-status", undefined),
      /Something went wrong/i
    )
    assert.match(agencyErrorMessage("update-agency", 500, "   "), /Something went wrong/i)
  })

  it("never returns an empty message", () => {
    const cases: Array<[number | undefined, string | undefined]> = [
      [undefined, undefined],
      [400, ""],
      [409, "   "],
      [503, undefined],
    ]
    for (const [status, serverMessage] of cases) {
      const message = agencyErrorMessage("load-agency", status, serverMessage)
      assert.ok(message.trim().length > 0)
    }
  })
})
