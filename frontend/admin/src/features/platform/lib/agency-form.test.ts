import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  isEmptyAgencyPatch,
  toAgencyFormValues,
  toAgencyOwnerInput,
  toAgencyUpdateInput,
  toCreateAgencyInput,
} from "./agency-form.ts"
import { toOwnerFormValue } from "./owner-selection.ts"
import {
  createAgencyFormSchema,
  newOwnerFormSchema,
  updateAgencyFormSchema,
} from "../schemas/agency-form.schema.ts"
import type { Agency } from "../types/agency.types.ts"

function agency(overrides: Partial<Agency> = {}): Agency {
  return {
    code: "AGY-ABCDEF123456",
    name: "Sahara Travel",
    status: "ACTIVE",
    country: "Morocco",
    description: "Desert circuits",
    owner: {
      code: "USR-3F2A91C7B4D0",
      email: "owner@example.com",
      firstName: "Ahmed",
      lastName: "Ali",
      status: "ACTIVE",
    },
    membersCount: 8,
    createdAt: "2026-09-18T10:00:00.000Z",
    updatedAt: "2026-09-18T10:00:00.000Z",
    ...overrides,
  }
}

const EXISTING_OWNER = {
  type: "EXISTING" as const,
  appUserCode: "USR-3F2A91C7B4D0",
}

const NEW_OWNER = {
  type: "NEW" as const,
  firstName: "Ahmed",
  lastName: "Ali",
  email: "ahmed@example.com",
  password: "a-strong-password",
}

const VALID_CREATE = {
  name: "Sahara Travel",
  country: "Morocco",
  description: "Desert circuits",
  owner: EXISTING_OWNER,
}

const VALID_CREATE_NEW_OWNER = { ...VALID_CREATE, owner: NEW_OWNER }

describe("createAgencyFormSchema", () => {
  it("accepts an agency owned by an existing account", () => {
    assert.equal(createAgencyFormSchema.safeParse(VALID_CREATE).success, true)
  })

  it("accepts an agency owned by a new account", () => {
    assert.equal(
      createAgencyFormSchema.safeParse(VALID_CREATE_NEW_OWNER).success,
      true
    )
  })

  it("accepts a form with only the required fields", () => {
    const result = createAgencyFormSchema.safeParse({
      ...VALID_CREATE,
      country: "",
      description: "",
    })
    assert.equal(result.success, true)
  })

  it("requires a name", () => {
    const result = createAgencyFormSchema.safeParse({ ...VALID_CREATE, name: "  " })
    assert.equal(result.success, false)
  })

  it("requires an owner to be chosen", () => {
    const result = createAgencyFormSchema.safeParse({ ...VALID_CREATE, owner: null })
    assert.equal(result.success, false)
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path.includes("owner")))
    }
  })

  it("has no website or domain field", () => {
    const parsed = createAgencyFormSchema.parse({
      ...VALID_CREATE,
      website: "https://sahara.example",
      domain: "sahara.example",
    } as Record<string, unknown>)
    assert.equal("website" in parsed, false)
    assert.equal("domain" in parsed, false)
  })

  it("enforces the backend length limits", () => {
    assert.equal(
      createAgencyFormSchema.safeParse({ ...VALID_CREATE, name: "x".repeat(201) })
        .success,
      false
    )
  })
})

describe("newOwnerFormSchema", () => {
  const VALID = {
    firstName: "Ahmed",
    lastName: "Ali",
    email: "Ahmed@Example.com",
    password: "a-strong-password",
    confirmPassword: "a-strong-password",
  }

  it("accepts a complete owner", () => {
    assert.equal(newOwnerFormSchema.safeParse(VALID).success, true)
  })

  it("normalizes the email", () => {
    const parsed = newOwnerFormSchema.parse(VALID)
    assert.equal(parsed.email, "ahmed@example.com")
  })

  it("requires a valid email", () => {
    for (const email of ["", "not-an-email"]) {
      assert.equal(newOwnerFormSchema.safeParse({ ...VALID, email }).success, false)
    }
  })

  it("enforces the identity password length", () => {
    assert.equal(
      newOwnerFormSchema.safeParse({
        ...VALID,
        password: "short",
        confirmPassword: "short",
      }).success,
      false
    )
    const long = "x".repeat(73)
    assert.equal(
      newOwnerFormSchema.safeParse({
        ...VALID,
        password: long,
        confirmPassword: long,
      }).success,
      false
    )
  })

  it("requires the confirmation to match, reported on the confirm field", () => {
    const result = newOwnerFormSchema.safeParse({
      ...VALID,
      confirmPassword: "something-else",
    })
    assert.equal(result.success, false)
    if (!result.success) {
      assert.ok(
        result.error.issues.some((issue) =>
          issue.path.includes("confirmPassword")
        )
      )
    }
  })

  it("names are optional", () => {
    assert.equal(
      newOwnerFormSchema.safeParse({ ...VALID, firstName: "", lastName: "" })
        .success,
      true
    )
  })
})

describe("toOwnerFormValue", () => {
  it("keeps only the account code for a selected account", () => {
    const value = toOwnerFormValue({
      type: "EXISTING",
      account: {
        code: "USR-3F2A91C7B4D0",
        firstName: "Ahmed",
        lastName: "Ali",
        email: "ahmed@example.com",
        status: "ACTIVE",
      },
    })
    // Display-only data from the picker must not reach the submitted value.
    assert.deepEqual(value, { type: "EXISTING", appUserCode: "USR-3F2A91C7B4D0" })
  })

  it("carries the identity fields for a new account", () => {
    const value = toOwnerFormValue({
      type: "NEW",
      draft: {
        firstName: "Nadia",
        lastName: "Bekkai",
        email: "nadia@example.com",
        password: "a-strong-password",
      },
    })
    assert.deepEqual(value, {
      type: "NEW",
      firstName: "Nadia",
      lastName: "Bekkai",
      email: "nadia@example.com",
      password: "a-strong-password",
    })
    assert.equal("confirmPassword" in value, false)
  })
})

describe("toAgencyOwnerInput", () => {
  it("sends the selected account code for an existing owner", () => {
    assert.deepEqual(toAgencyOwnerInput(EXISTING_OWNER), {
      type: "EXISTING",
      appUserCode: "USR-3F2A91C7B4D0",
    })
  })

  it("sends identity fields for a new owner, normalizing the email", () => {
    assert.deepEqual(
      toAgencyOwnerInput({ ...NEW_OWNER, email: "Ahmed@Example.com" }),
      {
        type: "NEW",
        email: "ahmed@example.com",
        password: "a-strong-password",
        firstName: "Ahmed",
        lastName: "Ali",
      }
    )
  })

  it("sends blank optional names as null", () => {
    const owner = toAgencyOwnerInput({
      ...NEW_OWNER,
      firstName: "  ",
      lastName: "",
    })
    assert.equal((owner as { firstName: string | null }).firstName, null)
    assert.equal((owner as { lastName: string | null }).lastName, null)
  })

  it("never sends ownership or privilege fields in either mode", () => {
    for (const owner of [EXISTING_OWNER, NEW_OWNER]) {
      const built = toAgencyOwnerInput(owner) as Record<string, unknown>
      for (const forbidden of [
        "membershipType",
        "systemKey",
        "roleKeys",
        "roleIds",
        "status",
        "id",
        "confirmPassword",
      ]) {
        assert.equal(forbidden in built, false, `${forbidden} must not be sent`)
      }
    }
  })
})

describe("toCreateAgencyInput", () => {
  it("builds exactly the fields the create endpoint accepts", () => {
    const input = toCreateAgencyInput(VALID_CREATE)
    assert.deepEqual(Object.keys(input).sort(), [
      "country",
      "description",
      "name",
      "owner",
    ])
  })

  it("carries each owner branch through", () => {
    assert.equal(toCreateAgencyInput(VALID_CREATE).owner.type, "EXISTING")
    assert.equal(toCreateAgencyInput(VALID_CREATE_NEW_OWNER).owner.type, "NEW")
  })

  it("sends untouched optional fields as null, not empty strings", () => {
    const input = toCreateAgencyInput({
      ...VALID_CREATE,
      country: "  ",
      description: "",
    })
    assert.equal(input.country, null)
    assert.equal(input.description, null)
  })

  it("trims the values it does send", () => {
    const input = toCreateAgencyInput({
      ...VALID_CREATE,
      name: "  Sahara Travel  ",
    })
    assert.equal(input.name, "Sahara Travel")
  })

  it("refuses to build a payload without an owner", () => {
    assert.throws(() => toCreateAgencyInput({ ...VALID_CREATE, owner: null }))
  })
})

describe("agency contracts have no website or domain", () => {
  it("the create payload never carries one", () => {
    for (const values of [VALID_CREATE, VALID_CREATE_NEW_OWNER]) {
      const input = toCreateAgencyInput(values) as Record<string, unknown>
      assert.equal("website" in input, false)
      assert.equal("domain" in input, false)
    }
  })

  it("the edit form values never carry one", () => {
    const values = toAgencyFormValues(agency()) as Record<string, unknown>
    assert.equal("website" in values, false)
    assert.equal("domain" in values, false)
    assert.deepEqual(Object.keys(values).sort(), ["country", "description", "name"])
  })
})

describe("toAgencyFormValues", () => {
  it("maps nulls to empty inputs", () => {
    const values = toAgencyFormValues(agency({ country: null, description: null }))
    assert.deepEqual(values, {
      name: "Sahara Travel",
      country: "",
      description: "",
    })
  })

  it("produces values the edit schema accepts", () => {
    assert.equal(
      updateAgencyFormSchema.safeParse(toAgencyFormValues(agency())).success,
      true
    )
  })
})

describe("toAgencyUpdateInput", () => {
  it("returns an empty patch when nothing changed", () => {
    const current = agency()
    const patch = toAgencyUpdateInput(current, toAgencyFormValues(current))
    assert.deepEqual(patch, {})
    assert.equal(isEmptyAgencyPatch(patch), true)
  })

  it("includes only the changed fields", () => {
    const current = agency()
    const patch = toAgencyUpdateInput(current, {
      ...toAgencyFormValues(current),
      name: "Sahara Tours",
    })
    assert.deepEqual(patch, { name: "Sahara Tours" })
  })

  it("clears an emptied optional field with null", () => {
    const current = agency()
    const patch = toAgencyUpdateInput(current, {
      ...toAgencyFormValues(current),
      country: "",
    })
    assert.deepEqual(patch, { country: null })
  })

  it("never produces status, code, owner, website or domain keys", () => {
    const current = agency()
    const patch = toAgencyUpdateInput(current, {
      name: "Changed",
      country: "Algeria",
      description: "Changed too",
    }) as Record<string, unknown>

    assert.deepEqual(Object.keys(patch).sort(), ["country", "description", "name"])
    for (const forbidden of [
      "status",
      "code",
      "owner",
      "ownerAppUserCode",
      "membershipType",
      "membersCount",
      "website",
      "domain",
    ]) {
      assert.equal(forbidden in patch, false, `${forbidden} must not be patched`)
    }
  })
})
