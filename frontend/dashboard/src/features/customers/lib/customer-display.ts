import type { AgencyCustomer } from "../types/customers.types"

/**
 * How to name a customer in the UI.
 *
 * Precedence: a recorded name, else the email, else the phone, else the
 * backend code — a customer is allowed to be a bare contact detail, and the
 * code is always there as the last truthful fallback.
 */
export function customerDisplayName(customer: {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  code: string
}): string {
  const name = [customer.firstName, customer.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")

  if (name) return name
  if (customer.email?.trim()) return customer.email.trim()
  if (customer.phone?.trim()) return customer.phone.trim()
  return customer.code
}

/** Up to two initials for the avatar; degrades to email or code, then "?". */
export function customerInitials(customer: {
  firstName: string | null
  lastName: string | null
  email: string | null
  code: string
}): string {
  const parts = [customer.firstName, customer.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  }

  const emailInitial = customer.email?.trim().charAt(0).toUpperCase()
  if (emailInitial) return emailInitial

  const codeInitial = customer.code.replace(/^CUS-?/i, "").charAt(0).toUpperCase()
  return codeInitial || "?"
}

/** Archiving is the backend's one-way soft-delete, so status is a fact to read. */
export function isArchivedCustomer(customer: { status: string }): boolean {
  return customer.status === "ARCHIVED"
}

/** Short absolute date. Invalid or missing input degrades to a dash. */
export function formatCustomerDate(value: string, locale = "en-GB"): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** True when a customer has no first, last, email or phone recorded. */
export function hasNoContactDetail(customer: Pick<
  AgencyCustomer,
  "firstName" | "lastName" | "email" | "phone"
>): boolean {
  return (
    !customer.firstName?.trim() &&
    !customer.lastName?.trim() &&
    !customer.email?.trim() &&
    !customer.phone?.trim()
  )
}