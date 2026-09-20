import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  EMPTY_FIELD,
  agencyActionsLabel,
  agencyStatusActionLabel,
  agencyStatusLabel,
  isFiltered,
  nextAgencyStatus,
  optionalText,
  ownerDisplayName,
  ownerSecondaryLine,
} from "./agency.ts"
import type { AgencyOwner } from "../types/agency.types.ts"

function owner(overrides: Partial<AgencyOwner> = {}): AgencyOwner {
  return {
    code: "USR-3F2A91C7B4D0",
    email: "owner@example.com",
    firstName: "Ahmed",
    lastName: "Ali",
    status: "ACTIVE",
    ...overrides,
  }
}

describe("agencyStatusLabel", () => {
  it("labels both statuses", () => {
    assert.equal(agencyStatusLabel("ACTIVE"), "Active")
    assert.equal(agencyStatusLabel("SUSPENDED"), "Suspended")
  })
})

describe("ownerDisplayName", () => {
  it("joins first and last name", () => {
    assert.equal(ownerDisplayName(owner()), "Ahmed Ali")
  })

  it("uses whichever name part exists", () => {
    assert.equal(ownerDisplayName(owner({ lastName: null })), "Ahmed")
    assert.equal(ownerDisplayName(owner({ firstName: null })), "Ali")
  })

  it("falls back to the email when no name is set", () => {
    assert.equal(
      ownerDisplayName(owner({ firstName: null, lastName: null })),
      "owner@example.com"
    )
  })
})

describe("ownerSecondaryLine", () => {
  it("shows the email under a real name", () => {
    assert.equal(ownerSecondaryLine(owner()), "owner@example.com")
  })

  it("omits the email when it is already the display name", () => {
    assert.equal(
      ownerSecondaryLine(owner({ firstName: null, lastName: null })),
      null
    )
  })
})

describe("optionalText", () => {
  it("renders a placeholder for missing values", () => {
    assert.equal(optionalText(null), EMPTY_FIELD)
    assert.equal(optionalText(undefined), EMPTY_FIELD)
    assert.equal(optionalText("   "), EMPTY_FIELD)
  })

  it("never prints null or undefined as text", () => {
    assert.notEqual(optionalText(null), "null")
    assert.notEqual(optionalText(undefined), "undefined")
  })

  it("trims real values", () => {
    assert.equal(optionalText("  Morocco "), "Morocco")
  })
})

describe("nextAgencyStatus", () => {
  it("toggles between the two statuses", () => {
    assert.equal(nextAgencyStatus("ACTIVE"), "SUSPENDED")
    assert.equal(nextAgencyStatus("SUSPENDED"), "ACTIVE")
  })

  it("labels the matching action", () => {
    assert.equal(agencyStatusActionLabel("ACTIVE"), "Suspend agency")
    assert.equal(agencyStatusActionLabel("SUSPENDED"), "Reactivate agency")
  })
})

describe("isFiltered", () => {
  it("is false only with no search and no status filter", () => {
    assert.equal(isFiltered("", "ALL"), false)
    assert.equal(isFiltered("   ", "ALL"), false)
    assert.equal(isFiltered("sahara", "ALL"), true)
    assert.equal(isFiltered("", "ACTIVE"), true)
  })
})

describe("agencyActionsLabel", () => {
  it("names the agency for screen readers", () => {
    assert.equal(
      agencyActionsLabel({ name: "Sahara Travel" }),
      "Open actions for Sahara Travel"
    )
  })
})
