/**
 * Lifecycle vocabulary mirrored from the backend's
 * `customer_status_check` database constraint.
 */
export type CustomerStatus = "ACTIVE" | "ARCHIVED"

/**
 * One business customer of ONE agency, from
 * `GET /v1/agencies/:code/customers`.
 *
 * A customer is NOT an identity: no `appUser` link, no credentials, no
 * database id. The only stable external key is the backend-generated `code`
 * (`CUS-...`), which is what the details route is keyed by.
 */
export type AgencyCustomer = {
  code: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  notes: string | null
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

/**
 * The writable fields, shared by create and update. All optional by design: a
 * customer can be a bare name, a bare phone number, or anything in between.
 * On update, an absent field is left untouched and `null` clears it.
 */
export type CustomerPayload = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}