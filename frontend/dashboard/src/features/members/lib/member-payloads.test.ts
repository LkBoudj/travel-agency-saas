import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildAddExistingMemberPayload,
  buildAddNewMemberPayload,
  buildReplaceRolesPayload,
  buildSetStatusPayload,
  normalizeRoleKeys,
  reactivatePayload,
  suspendPayload,
} from "./member-payloads.ts"

describe("EXISTING member payload", () => {
  it("sends the discriminator and the account code", () => {
    const payload = buildAddExistingMemberPayload({
      appUserCode: "USR-0000000000A1",
      roleKeys: ["AGENCY_BOOKING_AGENT"],
    })
    assert.deepEqual(payload, {
      member: { type: "EXISTING", appUserCode: "USR-0000000000A1" },
      roleKeys: ["AGENCY_BOOKING_AGENT"],
    })
  })

  it("never sends backend-owned fields", () => {
    const payload = buildAddExistingMemberPayload({
      appUserCode: "USR-1",
      roleKeys: [],
    })
    const member = payload.member as Record<string, unknown>
    for (const forbidden of [
      "membershipType",
      "status",
      "agencyId",
      "id",
      "systemKey",
      "roleIds",
    ]) {
      assert.equal(forbidden in member, false, `${forbidden} must not be sent`)
    }
  })

  it("accepts zero roles", () => {
    const payload = buildAddExistingMemberPayload({
      appUserCode: "USR-1",
      roleKeys: [],
    })
    assert.deepEqual(payload.roleKeys, [])
  })
})

describe("NEW member payload", () => {
  const values = {
    firstName: " Sara ",
    lastName: " Nadir ",
    email: "  Sara@Agency.Example ",
    password: "correct-horse",
    roleKeys: ["AGENCY_TOUR_MANAGER"],
  }

  it("sends exactly the fields the backend accepts", () => {
    const payload = buildAddNewMemberPayload(values)
    assert.deepEqual(payload, {
      member: {
        type: "NEW",
        email: "sara@agency.example",
        password: "correct-horse",
        firstName: "Sara",
        lastName: "Nadir",
      },
      roleKeys: ["AGENCY_TOUR_MANAGER"],
    })
  })

  it("never sends confirmPassword", () => {
    const payload = buildAddNewMemberPayload({
      ...values,
      // A confirmation field exists in the form and must not reach the wire.
      ...({ confirmPassword: "correct-horse" } as object),
    })
    assert.equal("confirmPassword" in payload.member, false)
    assert.equal(JSON.stringify(payload).includes("confirmPassword"), false)
  })

  it("normalizes the email and trims names", () => {
    const payload = buildAddNewMemberPayload(values)
    const member = payload.member as { email: string; firstName: unknown }
    assert.equal(member.email, "sara@agency.example")
    assert.equal(member.firstName, "Sara")
  })

  it("turns blank names into null rather than empty strings", () => {
    const payload = buildAddNewMemberPayload({
      ...values,
      firstName: "   ",
      lastName: undefined,
    })
    const member = payload.member as { firstName: unknown; lastName: unknown }
    assert.equal(member.firstName, null)
    assert.equal(member.lastName, null)
  })

  it("never asks for a membership type or ownership", () => {
    const member = buildAddNewMemberPayload(values).member as Record<
      string,
      unknown
    >
    assert.equal("membershipType" in member, false)
    assert.equal(JSON.stringify(member).includes("OWNER"), false)
  })
})

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
