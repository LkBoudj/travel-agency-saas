import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildDeparturePricesPayload,
  buildPricingOptionPayload,
  emptyPricingOptionForm,
  toDeparturePriceRows,
  toPricingOptionFormValues,
} from "./pricing-payloads.ts"
import type {
  DeparturePriceSet,
  PricingOption,
  PricingOptionStatus,
} from "../types/pricing.types.ts"

function option(
  code: string,
  status: PricingOptionStatus
): PricingOption {
  return {
    pricingOptionCode: code,
    name: code,
    description: null,
    basis: "per_person",
    currency: "DZD",
    status,
    pricedDepartureCount: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

describe("buildPricingOptionPayload", () => {
  it("trims the name and turns a blank description into null", () => {
    assert.deepEqual(
      buildPricingOptionPayload({
        name: "  Adult  ",
        description: "   ",
        basis: "per_person",
      }),
      { name: "Adult", description: null, basis: "per_person" }
    )
  })

  it("keeps a written description, trimmed", () => {
    assert.deepEqual(
      buildPricingOptionPayload({
        name: "Child",
        description: "  Ages 4-11  ",
        basis: "per_booking",
      }),
      { name: "Child", description: "Ages 4-11", basis: "per_booking" }
    )
  })
})

describe("emptyPricingOptionForm", () => {
  it("returns a blank definition defaulting to per-person", () => {
    assert.deepEqual(emptyPricingOptionForm(), {
      name: "",
      description: "",
      basis: "per_person",
    })
  })
})

describe("toPricingOptionFormValues", () => {
  it("maps a stored option into editable strings", () => {
    assert.deepEqual(
      toPricingOptionFormValues({
        ...option("PRC-ABC123", "ACTIVE"),
        name: "Adult",
        description: "Ages 12+",
      }),
      { name: "Adult", description: "Ages 12+", basis: "per_person" }
    )
  })

  it("turns a null description into an empty field", () => {
    assert.deepEqual(toPricingOptionFormValues(option("PRC-ABC123", "ACTIVE")), {
      name: "PRC-ABC123",
      description: "",
      basis: "per_person",
    })
  })
})

describe("toDeparturePriceRows", () => {
  const options = [option("PRC-ADULT", "ACTIVE"), option("PRC-CHILD", "ACTIVE")]

  it("builds one row per ACTIVE option, prefilled from the stored set", () => {
    const priceSet: DeparturePriceSet = {
      departureCode: "DEP-ABC",
      currency: "DZD",
      prices: [
        {
          pricingOptionCode: "PRC-CHILD",
          pricingOptionName: "PRC-CHILD",
          basis: "per_person",
          currency: "DZD",
          amount: 12000.5,
          active: true,
        },
      ],
    }
    assert.deepEqual(toDeparturePriceRows(options, priceSet), [
      { pricingOptionCode: "PRC-ADULT", amount: "" },
      { pricingOptionCode: "PRC-CHILD", amount: "12000.5" },
    ])
  })

  it("skips INACTIVE options entirely", () => {
    const withInactive = [
      ...options,
      option("PRC-VETERAN", "INACTIVE"),
    ]
    assert.equal(toDeparturePriceRows(withInactive, undefined).length, 2)
  })

  it("returns only empty rows when no set exists yet", () => {
    assert.deepEqual(toDeparturePriceRows(options, undefined), [
      { pricingOptionCode: "PRC-ADULT", amount: "" },
      { pricingOptionCode: "PRC-CHILD", amount: "" },
    ])
  })
})

describe("buildDeparturePricesPayload", () => {
  it("sends only rows that carry a positive amount", () => {
    assert.deepEqual(
      buildDeparturePricesPayload([
        { pricingOptionCode: "PRC-ADULT", amount: " 25000 " },
        { pricingOptionCode: "PRC-CHILD", amount: "12000.50" },
        { pricingOptionCode: "PRC-FREE", amount: "" },
        { pricingOptionCode: "PRC-ZERO", amount: "0" },
      ]),
      {
        prices: [
          { pricingOptionCode: "PRC-ADULT", amount: 25000 },
          { pricingOptionCode: "PRC-CHILD", amount: 12000.5 },
        ],
      }
    )
  })

  it("produces an empty set when nothing was typed", () => {
    assert.deepEqual(
      buildDeparturePricesPayload([
        { pricingOptionCode: "PRC-ADULT", amount: "" },
      ]),
      { prices: [] }
    )
  })
})