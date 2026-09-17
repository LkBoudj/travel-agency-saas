import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { rbacErrorMessage } from "./rbac-error-messages.ts"

describe("rbacErrorMessage", () => {
  it("maps 401 to a session message", () => {
    assert.equal(
      rbacErrorMessage("create-role", 401),
      "Your session has expired. Please sign in again."
    )
  })

  it("maps 403 to a permission message", () => {
    assert.equal(
      rbacErrorMessage("update-role", 403, "Forbidden"),
      "You do not have permission to perform this action."
    )
  })

  it("maps 404 to a missing role message", () => {
    assert.equal(
      rbacErrorMessage("delete-role", 404),
      "This role no longer exists. Refresh the page and try again."
    )
  })

  it("maps create/update name conflicts to a duplicate message", () => {
    assert.equal(
      rbacErrorMessage("create-role", 409),
      "A role with this name already exists."
    )
    assert.equal(
      rbacErrorMessage("update-role", 409, "raw backend conflict"),
      "A role with this name already exists."
    )
  })

  it("maps assigned-role delete conflicts to the required message", () => {
    assert.equal(
      rbacErrorMessage("delete-role", 409),
      "This role is assigned to one or more platform users and cannot be deleted."
    )
  })

  it("prefers the backend message for rejected permission keys", () => {
    assert.equal(
      rbacErrorMessage("replace-permissions", 400, "Unknown permission keys"),
      "Unknown permission keys"
    )
    assert.equal(
      rbacErrorMessage("replace-permissions", 400, "   "),
      "One or more selected permissions are not available for platform roles."
    )
  })

  it("falls back to the server message for other statuses", () => {
    assert.equal(
      rbacErrorMessage("create-role", 500, "Internal server error"),
      "Internal server error"
    )
  })

  it("falls back to a generic message when nothing is known", () => {
    assert.equal(
      rbacErrorMessage("create-role", undefined),
      "Something went wrong. Please try again."
    )
    assert.equal(
      rbacErrorMessage("create-role", undefined, "  "),
      "Something went wrong. Please try again."
    )
  })
})
