import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { platformUserErrorMessage } from "./platform-user-error-messages.ts"

describe("platformUserErrorMessage", () => {
  it("maps 401 to a session message", () => {
    assert.equal(
      platformUserErrorMessage("create-user", 401),
      "Your session has expired. Please sign in again."
    )
  })

  it("maps 403 to a permission message", () => {
    assert.equal(
      platformUserErrorMessage("update-user", 403, "Forbidden"),
      "You do not have permission to perform this action."
    )
  })

  it("maps 404 to a missing user message", () => {
    assert.equal(
      platformUserErrorMessage("replace-roles", 404),
      "This user no longer exists. Refresh the page and try again."
    )
  })

  it("maps duplicate emails to the required message", () => {
    assert.equal(
      platformUserErrorMessage("create-user", 409, "Conflict", "EMAIL_ALREADY_REGISTERED"),
      "A user with this email address already exists."
    )
  })

  it("falls back to the server message for other conflicts", () => {
    assert.equal(
      platformUserErrorMessage("update-user", 409, "raw backend conflict"),
      "raw backend conflict"
    )
  })

  it("maps agency role rejection on create and replace", () => {
    const message =
      "One or more selected roles are not platform roles and cannot be assigned here."
    assert.equal(
      platformUserErrorMessage(
        "create-user",
        400,
        "Forbidden",
        "AGENCY_ROLE_NOT_ASSIGNABLE"
      ),
      message
    )
    assert.equal(
      platformUserErrorMessage(
        "replace-roles",
        400,
        "Forbidden",
        "AGENCY_ROLE_NOT_ASSIGNABLE"
      ),
      message
    )
  })

  it("maps unknown role keys on create and replace", () => {
    const message =
      "One or more selected roles no longer exist. Refresh the page and try again."
    assert.equal(
      platformUserErrorMessage(
        "create-user",
        400,
        "Unknown",
        "UNKNOWN_PLATFORM_ROLE_KEYS"
      ),
      message
    )
    assert.equal(
      platformUserErrorMessage(
        "replace-roles",
        400,
        "Unknown",
        "UNKNOWN_PLATFORM_ROLE_KEYS"
      ),
      message
    )
  })

  it("maps self-suspension to the required message", () => {
    assert.equal(
      platformUserErrorMessage(
        "set-status",
        400,
        "Forbidden",
        "CANNOT_SUSPEND_OWN_ACCOUNT"
      ),
      "You cannot suspend your own account."
    )
  })

  it("maps missing-role selections defensively", () => {
    assert.equal(
      platformUserErrorMessage("replace-roles", 400, "", "ROLE_KEYS_REQUIRED"),
      "Select at least one role."
    )
  })

  it("prefers the backend message for other bad requests", () => {
    assert.equal(
      platformUserErrorMessage("update-user", 400, "Invalid payload"),
      "Invalid payload"
    )
    assert.equal(
      platformUserErrorMessage("update-user", 400, "   "),
      "Something went wrong. Please try again."
    )
  })

  it("falls back to the server message for other statuses", () => {
    assert.equal(
      platformUserErrorMessage("create-user", 500, "Internal server error"),
      "Internal server error"
    )
  })

  it("falls back to a generic message when nothing is known", () => {
    assert.equal(
      platformUserErrorMessage("create-user", undefined),
      "Something went wrong. Please try again."
    )
  })
})