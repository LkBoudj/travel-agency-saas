import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  hasAnyRowAction,
  memberRowActions,
  type MemberCapabilities,
} from "./member-actions.ts"

const ALL: MemberCapabilities = {
  canView: true,
  canInvite: true,
  canManageRoles: true,
  canUpdate: true,
  canRemove: true,
}

const NONE: MemberCapabilities = {
  canView: false,
  canInvite: false,
  canManageRoles: false,
  canUpdate: false,
  canRemove: false,
}

const owner = { membershipType: "OWNER", membershipStatus: "ACTIVE" }
const employee = { membershipType: "EMPLOYEE", membershipStatus: "ACTIVE" }
const suspendedEmployee = {
  membershipType: "EMPLOYEE",
  membershipStatus: "SUSPENDED",
}

describe("owner protection", () => {
  it("never offers a destructive action on the owner, even with every permission", () => {
    const actions = memberRowActions(owner, ALL)
    assert.equal(actions.canManageRoles, false)
    assert.equal(actions.canSuspend, false)
    assert.equal(actions.canReactivate, false)
    assert.equal(actions.canRemove, false)
  })

  it("still lets the owner be read", () => {
    assert.equal(memberRowActions(owner, ALL).canViewDetails, true)
  })

  it("protects the owner regardless of membership status", () => {
    const suspendedOwner = {
      membershipType: "OWNER",
      membershipStatus: "SUSPENDED",
    }
    const actions = memberRowActions(suspendedOwner, ALL)
    assert.equal(actions.canReactivate, false)
    assert.equal(actions.canRemove, false)
  })
})

describe("employee actions", () => {
  it("offers every action with full permissions", () => {
    const actions = memberRowActions(employee, ALL)
    assert.equal(actions.canManageRoles, true)
    assert.equal(actions.canSuspend, true)
    assert.equal(actions.canRemove, true)
  })

  it("offers Suspend only while active, Reactivate only while suspended", () => {
    assert.equal(memberRowActions(employee, ALL).canSuspend, true)
    assert.equal(memberRowActions(employee, ALL).canReactivate, false)
    assert.equal(memberRowActions(suspendedEmployee, ALL).canSuspend, false)
    assert.equal(memberRowActions(suspendedEmployee, ALL).canReactivate, true)
  })
})

describe("permission gating", () => {
  it("hides everything without permissions", () => {
    const actions = memberRowActions(employee, NONE)
    assert.equal(hasAnyRowAction(actions), false)
  })

  it("maps each permission to its own action independently", () => {
    const rolesOnly = memberRowActions(employee, { ...NONE, canManageRoles: true })
    assert.equal(rolesOnly.canManageRoles, true)
    assert.equal(rolesOnly.canSuspend, false)
    assert.equal(rolesOnly.canRemove, false)

    const updateOnly = memberRowActions(employee, { ...NONE, canUpdate: true })
    assert.equal(updateOnly.canSuspend, true)
    assert.equal(updateOnly.canManageRoles, false)
    assert.equal(updateOnly.canRemove, false)

    const removeOnly = memberRowActions(employee, { ...NONE, canRemove: true })
    assert.equal(removeOnly.canRemove, true)
    assert.equal(removeOnly.canSuspend, false)
  })

  it("requires both permission and non-ownership", () => {
    assert.equal(
      memberRowActions(owner, { ...NONE, canRemove: true }).canRemove,
      false
    )
    assert.equal(
      memberRowActions(employee, { ...NONE, canRemove: true }).canRemove,
      true
    )
  })
})

describe("hasAnyRowAction", () => {
  it("is true when at least one action is offered", () => {
    assert.equal(hasAnyRowAction(memberRowActions(owner, ALL)), true)
    assert.equal(hasAnyRowAction(memberRowActions(employee, ALL)), true)
  })
})
