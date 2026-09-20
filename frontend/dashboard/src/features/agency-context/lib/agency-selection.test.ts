import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  agencyUnavailableReason,
  decideAgencySelection,
  isAgencyEnterable,
} from "./agency-selection.ts"
import type { MyAgency } from "../types/agency-context.types.ts"

function agency(overrides: Partial<MyAgency> = {}): MyAgency {
  return {
    code: "AGY-SAHARA00001",
    name: "Sahara Travel",
    status: "ACTIVE",
    membershipType: "OWNER",
    membershipStatus: "ACTIVE",
    ...overrides,
  }
}

describe("isAgencyEnterable", () => {
  it("requires both the agency and the membership to be active", () => {
    assert.equal(isAgencyEnterable(agency()), true)
    assert.equal(isAgencyEnterable(agency({ status: "SUSPENDED" })), false)
    assert.equal(isAgencyEnterable(agency({ membershipStatus: "SUSPENDED" })), false)
  })
})

describe("agencyUnavailableReason", () => {
  it("gives no reason for an enterable agency", () => {
    assert.equal(agencyUnavailableReason(agency()), null)
  })

  it("distinguishes a suspended agency from a suspended membership", () => {
    assert.match(
      agencyUnavailableReason(agency({ status: "SUSPENDED" }))!,
      /agency is suspended/i
    )
    assert.match(
      agencyUnavailableReason(agency({ membershipStatus: "SUSPENDED" }))!,
      /your access/i
    )
  })
})

describe("decideAgencySelection", () => {
  it("reports NONE when the user belongs to no agency", () => {
    assert.deepEqual(decideAgencySelection([]), { kind: "NONE" })
  })

  it("enters the only usable agency without asking", () => {
    assert.deepEqual(decideAgencySelection([agency()]), {
      kind: "AUTO",
      agencyCode: "AGY-SAHARA00001",
    })
  })

  it("asks when there is more than one usable agency", () => {
    assert.deepEqual(
      decideAgencySelection([agency(), agency({ code: "AGY-ATLAS000001" })]),
      { kind: "CHOOSE" }
    )
  })

  it("skips unusable agencies when counting, so one active agency still auto-enters", () => {
    const decision = decideAgencySelection([
      agency({ code: "AGY-ATLAS000001", membershipStatus: "SUSPENDED" }),
      agency({ code: "AGY-SAHARA00001" }),
    ])
    assert.deepEqual(decision, { kind: "AUTO", agencyCode: "AGY-SAHARA00001" })
  })

  it("asks rather than showing nothing when the only membership is unusable", () => {
    // The chooser can explain WHY it is unavailable; an empty screen cannot.
    assert.deepEqual(decideAgencySelection([agency({ status: "SUSPENDED" })]), {
      kind: "CHOOSE",
    })
  })

  it("asks when every agency is unusable", () => {
    assert.deepEqual(
      decideAgencySelection([
        agency({ code: "A", status: "SUSPENDED" }),
        agency({ code: "B", membershipStatus: "SUSPENDED" }),
      ]),
      { kind: "CHOOSE" }
    )
  })
})
