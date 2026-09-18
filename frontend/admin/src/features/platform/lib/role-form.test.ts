import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  ROLE_KEY_MAX_LENGTH,
  roleFormSchema,
} from "../schemas/role-form.schema.ts"

const validValues = {
  name: "Support Manager",
  key: "PLATFORM_SUPPORT_MANAGER",
  description: "",
}

describe("roleFormSchema", () => {
  it("accepts a valid platform role", () => {
    assert.equal(roleFormSchema.safeParse(validValues).success, true)
  })

  it("accepts a key at the maximum length and rejects anything longer", () => {
    const atLimit = `A${"".padEnd(ROLE_KEY_MAX_LENGTH - 1, "B")}`
    const overLimit = `A${"".padEnd(ROLE_KEY_MAX_LENGTH, "B")}`

    assert.equal(
      roleFormSchema.safeParse({ ...validValues, key: atLimit }).success,
      true
    )
    assert.equal(
      roleFormSchema.safeParse({ ...validValues, key: overLimit }).success,
      false
    )
  })

  it("requires a non-empty display name", () => {
    assert.equal(
      roleFormSchema.safeParse({ ...validValues, name: "   " }).success,
      false
    )
  })

  it("requires a technical key", () => {
    assert.equal(
      roleFormSchema.safeParse({ ...validValues, key: "" }).success,
      false
    )
  })

  it("rejects invalid key formats", () => {
    for (const key of [
      "lower_case",
      "1LEADING_DIGIT",
      "HAS SPACE",
      "HAS-DASH",
      "HAS.DOT",
    ]) {
      assert.equal(
        roleFormSchema.safeParse({ ...validValues, key }).success,
        false,
        `expected key to be rejected: ${key}`
      )
    }
  })
})
