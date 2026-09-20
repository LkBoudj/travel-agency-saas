import { apiRequest } from "@/lib/api"
import type {
  AgencyCustomer,
  CustomerPayload,
} from "../types/customers.types"

/**
 * Query keys.
 *
 * Every key starts with the agency code, so two tabs in two agencies keep
 * separate caches and a mutation in one can never invalidate the other's data.
 */
export const customersQueryKeys = {
  all: (agencyCode: string) => ["agency", agencyCode, "customers"] as const,
  list: (agencyCode: string, search: string) =>
    ["agency", agencyCode, "customers", "list", search] as const,
  detail: (agencyCode: string, customerCode: string) =>
    ["agency", agencyCode, "customers", "detail", customerCode] as const,
}

function base(agencyCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}`
}

export function listCustomers(
  agencyCode: string,
  search: string
): Promise<AgencyCustomer[]> {
  const query = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : ""
  return apiRequest<AgencyCustomer[]>(`${base(agencyCode)}/customers${query}`)
}

/** Reads by code; archived records remain readable so stored links keep working. */
export function getCustomer(
  agencyCode: string,
  customerCode: string
): Promise<AgencyCustomer> {
  return apiRequest<AgencyCustomer>(
    `${base(agencyCode)}/customers/${encodeURIComponent(customerCode)}`
  )
}

export function createCustomer(
  agencyCode: string,
  payload: CustomerPayload
): Promise<AgencyCustomer> {
  return apiRequest<AgencyCustomer>(`${base(agencyCode)}/customers`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(
  agencyCode: string,
  customerCode: string,
  payload: CustomerPayload
): Promise<AgencyCustomer> {
  return apiRequest<AgencyCustomer>(
    `${base(agencyCode)}/customers/${encodeURIComponent(customerCode)}`,
    { method: "PATCH", body: JSON.stringify(payload) }
  )
}

/** One-way soft-delete. There is no restore endpoint. */
export function archiveCustomer(
  agencyCode: string,
  customerCode: string
): Promise<AgencyCustomer> {
  return apiRequest<AgencyCustomer>(
    `${base(agencyCode)}/customers/${encodeURIComponent(customerCode)}/archive`,
    { method: "PATCH" }
  )
}