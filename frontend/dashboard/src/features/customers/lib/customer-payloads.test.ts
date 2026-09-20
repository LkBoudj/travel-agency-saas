import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildCustomerPayload,
  toCustomerFormValues,
} from "./customer-payloads.ts"

describe("buildCustomerPayload", () => {
  it("trims real values and nulls blank fields", () => {
    const payload = buildCustomerPayload({
      firstName: "  ",
      lastName: "  Bensaid ",
      email: " A@B.COM ",
      phone: "",
      notes: " ",
    })
    assert.deepEqual(payload, {
      firstName: null,
      lastName: "Bensaid",
      email: "a@b.com",
      phone: null,
      notes: null,
    })
  })

  it("keeps complete values as-is", () => {
    const payload = buildCustomerPayload({
      firstName: "Amira",
      lastName: "Ziani",
      email: "amira@ziani.dz",
      phone: "0550123456",
      notes: "Prefers weekend departures.",
    })
    assert.deepEqual(payload, {
      firstName: "Amira",
      lastName: "Ziani",
      email: "amira@ziani.dz",
      phone: "0550123456",
      notes: "Prefers weekend departures.",
    })
  })
})

describe("toCustomerFormValues", () => {
  it("maps nulls to empty fields", () => {
    const customer = {
      code: "CUS-A1B2C3",
      firstName: null,
      lastName: "Bensaid",
      email: null,
      phone: null,
      notes: null,
      status: "ACTIVE" as const,
      createdAt: "2026-09-19T10:00:00.000Z",
      updatedAt: "2026-09-19T10:00:00.000Z",
    }
    assert.deepEqual(toCustomerFormValues(customer), {
      firstName: "",
      lastName: "Bensaid",
      email: "",
      phone: "",
      notes: "",
    })
  })
})