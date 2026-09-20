import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  isArchivedTourStatus,
  tourRowActions,
  type TourCapabilities,
} from "./tour-actions.ts"

const caps: TourCapabilities = {
  canView: true,
  canCreate: true,
  canUpdate: true,
  canPublish: true,
  canArchive: true,
}

describe("tourRowActions", () => {
  it("offers publish and archive while the tour is not archived", () => {
    const actions = tourRowActions("DRAFT", caps)
    assert.deepEqual(actions, {
      canEdit: true,
      canPublish: true,
      canArchive: true,
    })
  })

  it("hides publish and archive for archived tours", () => {
    assert.deepEqual(tourRowActions("ARCHIVED", caps), {
      canEdit: true,
      canPublish: false,
      canArchive: false,
    })
  })

  it("reflects missing permissions", () => {
    const noPublish: TourCapabilities = { ...caps, canPublish: false }
    assert.deepEqual(tourRowActions("PUBLISHED", noPublish), {
      canEdit: true,
      canPublish: false,
      canArchive: true,
    })
  })
})

describe("isArchivedTourStatus", () => {
  it("recognises the archived lifecycle state", () => {
    assert.equal(isArchivedTourStatus("ARCHIVED"), true)
    assert.equal(isArchivedTourStatus("DRAFT"), false)
  })
})