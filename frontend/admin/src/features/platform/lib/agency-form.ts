import type {
  AgencyCreateInput,
  AgencyOwnerInput,
  AgencyUpdateInput,
} from "../api/agencies.api"
import type { Agency } from "../types/agency.types"
import type {
  CreateAgencyFormValues,
  UpdateAgencyFormValues,
} from "../schemas/agency-form.schema"

/** An untouched optional text field is sent as null, never as "". */
function optionalValue(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Maps the owner captured by the create form to the discriminated owner
 * contract.
 *
 * Whichever branch is taken, the result carries only identity/selection data:
 * `membershipType`, `systemKey`, role keys/ids and account status are
 * backend-owned and are structurally impossible to produce here. The password
 * confirmation never leaves the client.
 */
export function toAgencyOwnerInput(
  owner: NonNullable<CreateAgencyFormValues["owner"]>
): AgencyOwnerInput {
  if (owner.type === "EXISTING") {
    return { type: "EXISTING", appUserCode: owner.appUserCode.trim() }
  }
  return {
    type: "NEW",
    email: owner.email.trim().toLowerCase(),
    password: owner.password,
    firstName: optionalValue(owner.firstName),
    lastName: optionalValue(owner.lastName),
  }
}

/**
 * Maps the create form to the `POST /v1/agencies` payload.
 *
 * Only the fields the backend accepts are produced; it rejects unknown keys
 * outright. There is deliberately no `website`/`domain`: domains belong to a
 * later Agency Settings feature.
 */
export function toCreateAgencyInput(
  values: CreateAgencyFormValues
): AgencyCreateInput {
  if (!values.owner) {
    throw new Error("toCreateAgencyInput called without an owner")
  }
  return {
    name: values.name.trim(),
    owner: toAgencyOwnerInput(values.owner),
    country: optionalValue(values.country),
    description: optionalValue(values.description),
  }
}

/** The form fields that map onto the agency patch contract. */
export function toAgencyFormValues(agency: Agency): UpdateAgencyFormValues {
  return {
    name: agency.name,
    country: agency.country ?? "",
    description: agency.description ?? "",
  }
}

/**
 * Builds the `PATCH /v1/agencies/:code` payload, including only fields whose
 * value actually changed.
 *
 * Two guarantees this function exists to keep:
 * - the patch can never carry `status`, `code`, `owner` or any ownership field,
 *   because only these four keys are ever produced;
 * - an unchanged form produces an empty patch, which the caller treats as a
 *   no-op instead of sending a request the backend would reject.
 */
export function toAgencyUpdateInput(
  agency: Agency,
  values: UpdateAgencyFormValues
): AgencyUpdateInput {
  const patch: AgencyUpdateInput = {}
  const name = values.name.trim()
  const country = optionalValue(values.country)
  const description = optionalValue(values.description)

  if (name !== agency.name) {
    patch.name = name
  }
  if (country !== (agency.country ?? null)) {
    patch.country = country
  }
  if (description !== (agency.description ?? null)) {
    patch.description = description
  }

  return patch
}

/** True when the edit form has nothing to send. */
export function isEmptyAgencyPatch(patch: AgencyUpdateInput): boolean {
  return Object.keys(patch).length === 0
}
