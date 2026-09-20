import type { AgencyCustomer, CustomerPayload } from "../types/customers.types"

/**
 * A blank form field means "no value", never a stored `""` stub: the backend
 * persists `null` for it (and on update clears the stored value). An absent
 * `undefined` is passed through untouched so the schema keeps its optional-key
 * contract for callers that need it.
 */
function trimToNull(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined) return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/** Email is normalized like the backend does: trimmed and lowercased. */
function normalizeEmail(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined) return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed.toLowerCase()
}

/**
 * Turns the five always-present form fields into the create/update payload.
 * The form always sends every field, so an emptied field becomes `null` —
 * which is exactly what creating a bare record and clearing a stored value
 * both need, on one shared shape.
 */
export function buildCustomerPayload(input: {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}): CustomerPayload {
  return {
    firstName: trimToNull(input.firstName),
    lastName: trimToNull(input.lastName),
    email: normalizeEmail(input.email),
    phone: trimToNull(input.phone),
    notes: trimToNull(input.notes),
  }
}

/** Starts the edit form from a stored customer, with `null` as an empty field. */
export function toCustomerFormValues(customer: AgencyCustomer): {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
} {
  return {
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    notes: customer.notes ?? "",
  }
}