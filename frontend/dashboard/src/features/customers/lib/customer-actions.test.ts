import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  customerRowActions,
  hasAnyRowAction,
  type CustomerCapabilities,
} from "./customer-actions.ts"

const ALL: CustomerCapabilities = {
  canView: true,
  canCreate: true,
  canUpdate: true,
  canArchive: true,
}

const NONE: CustomerCapabilities = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canArchive: false,
}

const active = { status: "ACTIVE" }
const archived = { status: "ARCHIVED" }

describe("archive gating", () => {
  it("offers archive on an active customer with permission", () => {
    assert.equal(customerRowActions(active, ALL).canArchive, true)
  })

  it("never offers archive on an archived customer", () => {
    assert.equal(customerRowActions(archived, ALL).canArchive, false)
  })
})

describe("permission gating", () => {
  it("hides everything without permissions", () => {
    assert.equal(hasAnyRowAction(customerRowActions(active, NONE)), false)
  })

  it("maps each permission to its own action independently", () => {
    const updateOnly = customerRowActions(active, { ...NONE, canUpdate: true })
    assert.equal(updateOnly.canEdit, true)
    assert.equal(updateOnly.canArchive, false)

    const archiveOnly = customerRowActions(active, { ...NONE, canArchive: true })
    assert.equal(archiveOnly.canArchive, true)
    assert.equal(archiveOnly.canEdit, false)
  })

  it("details are readable for everyone with the view permission", () => {
    assert.equal(
      customerRowActions(active, { ...NONE, canView: true }).canViewDetails,
      true
    )
  })

  it("lets archived customers be edited when update is allowed", () => {
    assert.equal(
      customerRowActions(archived, { ...NONE, canUpdate: true }).canEdit,
      true
    )
  })
})

describe("hasAnyRowAction", () => {
  it("is true when at least one action is offered", () => {
    assert.equal(hasAnyRowAction(customerRowActions(active, ALL)), true)
    assert.equal(hasAnyRowAction(customerRowActions(archived, ALL)), true)
  })
})