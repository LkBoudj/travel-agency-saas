import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  AGENCY_SECTIONS,
  agencyBasePath,
  agencyDashboardPath,
  agencyPath,
  legacyPathToAgencyPath,
} from "./agency-paths.ts"

const CODE = "AGY-SAHARA00001"

describe("agency path builders", () => {
  it("puts the agency in the path, which is what makes the URL the context", () => {
    assert.equal(agencyBasePath(CODE), `/agencies/${CODE}`)
    assert.equal(agencyPath(CODE, "trips"), `/agencies/${CODE}/trips`)
    assert.equal(agencyDashboardPath(CODE), `/agencies/${CODE}/dashboard`)
  })

  it("accepts a section with or without a leading slash", () => {
    assert.equal(agencyPath(CODE, "/trips"), agencyPath(CODE, "trips"))
  })

  it("encodes the code so an odd value cannot break out of the path", () => {
    assert.equal(agencyPath("a/b", "trips"), "/agencies/a%2Fb/trips")
  })

  it("builds a distinct path per agency, so two tabs never collide", () => {
    assert.notEqual(agencyDashboardPath("AGY-A"), agencyDashboardPath("AGY-B"))
  })
})

describe("legacyPathToAgencyPath", () => {
  it("keeps the section of a pre-agency-scoped link", () => {
    for (const section of Object.values(AGENCY_SECTIONS)) {
      assert.equal(
        legacyPathToAgencyPath(CODE, `/${section}`),
        `/agencies/${CODE}/${section}`
      )
    }
  })

  it("keeps the section when the old link had extra segments", () => {
    assert.equal(
      legacyPathToAgencyPath(CODE, "/trips/abc"),
      `/agencies/${CODE}/trips`
    )
  })

  it("falls back to the dashboard for an unknown section", () => {
    assert.equal(
      legacyPathToAgencyPath(CODE, "/something-else"),
      `/agencies/${CODE}/dashboard`
    )
    assert.equal(legacyPathToAgencyPath(CODE, "/"), `/agencies/${CODE}/dashboard`)
  })
})
