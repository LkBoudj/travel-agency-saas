import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  customerDisplayName,
  customerInitials,
  formatCustomerDate,
  hasNoContactDetail,
  isArchivedCustomer,
} from "./customer-display.ts"

describe("customerDisplayName", () => {
  const base = {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    code: "CUS-A1B2C3",
  }

  it("joins first and last names", () => {
    assert.equal(
      customerDisplayName({ ...base, firstName: "Ahmed", lastName: "Bensaid" }),
      "Ahmed Bensaid"
    )
  })

  it("falls back to the email when no name is recorded", () => {
    assert.equal(
      customerDisplayName({ ...base, email: "a@b.com", firstName: " ", lastName: null }),
      "a@b.com"
    )
  })

  it("falls back to the phone before the code", () => {
    assert.equal(
      customerDisplayName({ ...base, phone: "0550 12 34 56" }),
      "0550 12 34 56"
    )
  })

  it("falls back to the code as a last resort", () => {
    assert.equal(customerDisplayName(base), "CUS-A1B2C3")
  })
})

describe("customerInitials", () => {
  const base = {
    firstName: null,
    lastName: null,
    email: null,
    code: "CUS-A1B2C3",
  }

  it("uses the first letters of up to two names", () => {
    assert.equal(
      customerInitials({ ...base, firstName: "Ahmed", lastName: "Bensaid" }),
      "AB"
    )
  })

  it("falls back to the email's first letter", () => {
    assert.equal(customerInitials({ ...base, email: "amira@b.com" }), "A")
  })

  it("falls back to the code's first letter, stripping the prefix", () => {
    assert.equal(customerInitials(base), "A")
  })

  it("degrades to a question mark for an empty code", () => {
    assert.equal(customerInitials({ ...base, code: "" }), "?")
  })
})

describe("archived status", () => {
  it("recognises ARCHIVED and nothing else", () => {
    assert.equal(isArchivedCustomer({ status: "ARCHIVED" }), true)
    assert.equal(isArchivedCustomer({ status: "ACTIVE" }), false)
  })
})

describe("hasNoContactDetail", () => {
  const none = { firstName: null, lastName: null, email: null, phone: null }

  it("is true when every contact field is absent or blank", () => {
    assert.equal(hasNoContactDetail(none), true)
    assert.equal(
      hasNoContactDetail({ ...none, firstName: "  ", phone: "" }),
      true
    )
  })

  it("is false when any contact detail exists", () => {
    assert.equal(hasNoContactDetail({ ...none, email: "a@b.com" }), false)
    assert.equal(hasNoContactDetail({ ...none, phone: "0550" }), false)
  })
})

describe("formatCustomerDate", () => {
  it("formats a valid ISO date", () => {
    const formatted = formatCustomerDate("2026-09-19T10:00:00.000Z")
    assert.match(formatted, /2026/)
    assert.match(formatted, /19/)
  })

  it("degrades to a dash for invalid or missing input", () => {
    assert.equal(formatCustomerDate("not-a-date"), "—")
    assert.equal(formatCustomerDate(""), "—")
  })
})