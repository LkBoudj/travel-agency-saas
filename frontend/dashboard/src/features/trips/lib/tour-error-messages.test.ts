import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { tourErrorMessage } from "./tour-error-messages.ts"

describe("tourErrorMessage", () => {
  it("maps the tour lifecycle codes to actionable words", () => {
    assert.match(
      tourErrorMessage(404, "TOUR_NOT_FOUND", "raw internal"),
      /does not exist/
    )
    assert.match(
      tourErrorMessage(409, "TOUR_ALREADY_ARCHIVED", "raw"),
      /already archived/
    )
    assert.match(
      tourErrorMessage(409, "TOUR_PUBLISH_STATE_BLOCKED", "raw"),
      /cannot be published or unpublished/
    )
    assert.match(
      tourErrorMessage(409, "TOUR_PUBLISH_READINESS_BLOCKED", "raw"),
      /not ready to publish/
    )
    assert.match(
      tourErrorMessage(404, "DEPARTURE_NOT_FOUND", "raw"),
      /no longer exists/
    )
    assert.match(
      tourErrorMessage(409, "DEPARTURE_ALREADY_CANCELLED", "raw"),
      /already cancelled/
    )
    assert.match(
      tourErrorMessage(404, "PRICING_OPTION_NOT_FOUND", "raw"),
      /no longer exists/
    )
    assert.match(
      tourErrorMessage(409, "PRICING_OPTION_NAME_TAKEN", "raw"),
      /already uses this name/
    )
    assert.match(
      tourErrorMessage(409, "PRICING_OPTION_INACTIVE", "raw"),
      /inactive/
    )
    assert.match(
      tourErrorMessage(409, "PRICING_OPTION_ALREADY_INACTIVE", "raw"),
      /already inactive/
    )
    assert.match(
      tourErrorMessage(422, "PRICING_CURRENCY_MISMATCH", "raw"),
      /tour's currency/
    )
  })

  it("uses status as the fallback axis for unknown codes", () => {
    assert.match(tourErrorMessage(409, "SOME_NEW_CODE"), /conflicts/)
    assert.match(tourErrorMessage(404), /no longer exists/)
    assert.match(tourErrorMessage(500), /on our side/)
  })

  it("is session-aware", () => {
    assert.equal(tourErrorMessage(401), "Your session has expired. Sign in again to continue.")
  })
})