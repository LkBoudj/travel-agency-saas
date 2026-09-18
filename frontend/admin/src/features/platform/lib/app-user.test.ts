import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { appUserOptionLabel, isSelectableOwner } from "./app-user.ts"
import type { AppUserOption } from "../types/app-user.types.ts"

function option(overrides: Partial<AppUserOption> = {}): AppUserOption {
  return {
    code: "USR-3F2A91C7B4D0",
    firstName: "Ahmed",
    lastName: "Ali",
    email: "ahmed@example.com",
    status: "ACTIVE",
    ...overrides,
  }
}

describe("appUserOptionLabel", () => {
  it("joins the name parts", () => {
    assert.equal(appUserOptionLabel(option()), "Ahmed Ali")
  })

  it("uses whichever part exists", () => {
    assert.equal(appUserOptionLabel(option({ lastName: null })), "Ahmed")
    assert.equal(appUserOptionLabel(option({ firstName: null })), "Ali")
  })

  it("falls back to the email for an account with no name", () => {
    assert.equal(
      appUserOptionLabel(option({ firstName: null, lastName: null })),
      "ahmed@example.com"
    )
  })

  it("never renders the account code as the label", () => {
    // The code is an internal identifier; the admin picks people by name/email.
    assert.notEqual(appUserOptionLabel(option()), option().code)
  })
})

describe("isSelectableOwner", () => {
  it("allows an active account", () => {
    assert.equal(isSelectableOwner(option()), true)
  })

  it("blocks a suspended account, matching the backend rule", () => {
    assert.equal(isSelectableOwner(option({ status: "SUSPENDED" })), false)
  })
})
