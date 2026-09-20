import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  tourLocationName,
  tourPrimaryDestinationName,
} from "./tour-destination-display.ts"

describe("tourLocationName", () => {
  it("prefers the specific place over administrative context", () => {
    assert.equal(
      tourLocationName({
        wilayaCode: "15",
        cityId: "Tikjda",
        place: "Tikjda",
      }),
      "Tikjda"
    )
  })

  it("falls back through city then wilaya", () => {
    assert.equal(
      tourLocationName({ wilayaCode: "15", cityId: "Illizi", place: "" }),
      "Illizi"
    )
    assert.equal(
      tourLocationName({ wilayaCode: "15", cityId: null, place: null }),
      "15"
    )
  })

  it("returns an empty string for an empty location", () => {
    assert.equal(tourLocationName(undefined), "")
    assert.equal(
      tourLocationName({ wilayaCode: "", cityId: "  ", place: null }),
      ""
    )
  })
})

describe("tourPrimaryDestinationName", () => {
  it("uses the first destination", () => {
    assert.equal(
      tourPrimaryDestinationName([
        { wilayaCode: "15", cityId: "Illizi", place: "" },
        { wilayaCode: "11", cityId: "Djanet", place: "" },
      ]),
      "Illizi"
    )
  })

  it("handles an empty list", () => {
    assert.equal(tourPrimaryDestinationName([]), "")
  })
})