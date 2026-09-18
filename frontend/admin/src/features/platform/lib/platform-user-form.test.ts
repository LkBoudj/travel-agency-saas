import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  PLATFORM_USER_PASSWORD_MAX_LENGTH,
  PLATFORM_USER_PASSWORD_MIN_LENGTH,
  createPlatformUserFormSchema,
  updatePlatformUserFormSchema,
} from "../schemas/platform-user-form.schema.ts"

const validCreate = {
  email: "operator@agency.dev",
  password: "super-secret-1",
  confirmPassword: "super-secret-1",
  firstName: "Aya",
  lastName: "Bennani",
  roleKeys: ["PLATFORM_OPERATOR"],
}

describe("createPlatformUserFormSchema", () => {
  it("accepts a valid platform user", () => {
    assert.equal(createPlatformUserFormSchema.safeParse(validCreate).success, true)
  })

  it("normalizes the email to lowercase", () => {
    const result = createPlatformUserFormSchema.safeParse({
      ...validCreate,
      email: " OPERATOR@AGENCY.dev ",
    })
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.email, "operator@agency.dev")
    }
  })

  it("rejects an invalid email", () => {
    assert.equal(
      createPlatformUserFormSchema.safeParse({
        ...validCreate,
        email: "not-an-email",
      }).success,
      false
    )
  })

  it("rejects passwords shorter than the minimum length", () => {
    const short = "a".repeat(PLATFORM_USER_PASSWORD_MIN_LENGTH - 1)
    assert.equal(
      createPlatformUserFormSchema.safeParse({
        ...validCreate,
        password: short,
        confirmPassword: short,
      }).success,
      false
    )
  })

  it("rejects passwords longer than the maximum length", () => {
    const long = "a".repeat(PLATFORM_USER_PASSWORD_MAX_LENGTH + 1)
    assert.equal(
      createPlatformUserFormSchema.safeParse({
        ...validCreate,
        password: long,
        confirmPassword: long,
      }).success,
      false
    )
  })

  it("rejects mismatched password confirmation", () => {
    assert.equal(
      createPlatformUserFormSchema.safeParse({
        ...validCreate,
        confirmPassword: "not-the-same",
      }).success,
      false
    )
  })

  it("requires at least one platform role", () => {
    assert.equal(
      createPlatformUserFormSchema.safeParse({
        ...validCreate,
        roleKeys: [],
      }).success,
      false
    )
  })

  it("accepts whitespace-only optional names (normalized to empty)", () => {
    const result = createPlatformUserFormSchema.safeParse({
      ...validCreate,
      firstName: "   ",
    })
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.firstName, "")
    }
  })
})

describe("updatePlatformUserFormSchema", () => {
  it("accepts an unchanged-but-valid profile", () => {
    assert.equal(
      updatePlatformUserFormSchema.safeParse({
        email: "operator@agency.dev",
        firstName: "",
        lastName: "",
      }).success,
      true
    )
  })

  it("rejects an invalid email", () => {
    assert.equal(
      updatePlatformUserFormSchema.safeParse({
        email: "not-an-email",
      }).success,
      false
    )
  })
})