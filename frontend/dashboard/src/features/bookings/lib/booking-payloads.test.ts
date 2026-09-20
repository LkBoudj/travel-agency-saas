import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildCancelBookingPayload,
  buildCreateBookingPayload,
} from "./booking-payloads.ts"

describe("buildCreateBookingPayload", () => {
  it("keeps codes trimmed and seats converted to a number", () => {
    const payload = buildCreateBookingPayload({
      customerCode: " CUS-41 ",
      departureCode: "DEP-9 ",
      reservedSeats: "3",
      pricingSelections: ["PRC-1", "PRC-2"],
      notes: "  ",
    })
    assert.deepEqual(payload, {
      customerCode: "CUS-41",
      departureCode: "DEP-9",
      reservedSeats: 3,
      pricingSelections: ["PRC-1", "PRC-2"],
      notes: null,
    })
  })

  it("never sends tourCode and turns blank notes into null", () => {
    const payload = buildCreateBookingPayload({
      customerCode: "CUS-1",
      departureCode: "DEP-1",
      reservedSeats: "1",
      pricingSelections: [],
      notes: "Window seat",
    })
    assert.equal("tourCode" in payload, false)
    assert.equal(payload.notes, "Window seat")
  })
})

describe("buildCancelBookingPayload", () => {
  it("passes a trimmed reason through", () => {
    assert.deepEqual(buildCancelBookingPayload("  Client changed plans  "), {
      reason: "Client changed plans",
    })
  })

  it("turns a blank reason into null", () => {
    assert.deepEqual(buildCancelBookingPayload("   "), { reason: null })
  })
})