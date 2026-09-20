import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isSessionExpired, memberErrorMessage } from "./member-error-messages.ts"

describe("documented backend error codes", () => {
  const cases: Array<[string, RegExp]> = [
    ["ALREADY_AGENCY_MEMBER", /already a member/i],
    ["MEMBER_APP_USER_NOT_ACTIVE", /not active/i],
    ["UNKNOWN_AGENCY_ROLE_KEYS", /no longer exists/i],
    ["ROLE_NOT_ASSIGNABLE_IN_AGENCY", /cannot be assigned/i],
    ["OWNER_CANNOT_BE_SUSPENDED", /owner cannot be suspended/i],
    ["OWNER_CANNOT_BE_REMOVED", /owner cannot be removed/i],
    ["OWNER_ROLES_IMMUTABLE", /owner's roles cannot be changed/i],
  ]

  for (const [code, pattern] of cases) {
    it(`explains ${code}`, () => {
      assert.match(memberErrorMessage(409, code), pattern)
    })
  }

  it("prefers the code over the status", () => {
    assert.match(
      memberErrorMessage(409, "ALREADY_AGENCY_MEMBER"),
      /already a member/i
    )
  })
})

describe("status fallbacks", () => {
  it("handles 401 as an expired session", () => {
    assert.match(memberErrorMessage(401), /session/i)
    assert.equal(isSessionExpired(401), true)
    assert.equal(isSessionExpired(403), false)
  })

  it("gives a friendly permission message for 403", () => {
    assert.match(memberErrorMessage(403), /permission/i)
  })

  it("explains 404 and 409 without jargon", () => {
    assert.match(memberErrorMessage(404), /no longer exists/i)
    assert.match(memberErrorMessage(409), /conflicts/i)
  })

  it("relays a human validation message on 400", () => {
    assert.equal(
      memberErrorMessage(400, undefined, "Email is required"),
      "Email is required"
    )
  })

  it("falls back when a 400 carries no usable message", () => {
    assert.match(memberErrorMessage(400, undefined, "   "), /not valid/i)
  })

  it("does not blame the user for a 500", () => {
    assert.match(memberErrorMessage(500), /our side/i)
  })
})

describe("safety", () => {
  it("never returns an empty message", () => {
    for (const status of [400, 401, 403, 404, 409, 418, 500, 503]) {
      assert.ok(memberErrorMessage(status).trim().length > 0)
    }
  })

  it("ignores an unknown code and still answers by status", () => {
    assert.match(memberErrorMessage(403, "SOME_NEW_CODE"), /permission/i)
  })

  it("never leaks a raw database message", () => {
    const leaked =
      'duplicate key value violates unique constraint "agency_membership_pkey"'
    const message = memberErrorMessage(409, "ALREADY_AGENCY_MEMBER", leaked)
    assert.equal(message.includes("constraint"), false)
    assert.equal(message.includes("duplicate key"), false)
  })

  it("does not relay a raw server message on 409 or 500", () => {
    const leaked = "PrismaClientKnownRequestError: P2002 on agency_membership"
    assert.equal(memberErrorMessage(409, undefined, leaked).includes("P2002"), false)
    assert.equal(memberErrorMessage(500, undefined, leaked).includes("P2002"), false)
  })
})
