import type { Prisma } from '../generated/prisma/client.js';

/** Lifecycle vocabulary enforced by the `customer_status_check` constraint. */
export type CustomerStatus = 'ACTIVE' | 'ARCHIVED';

/**
 * The public shape of a customer record.
 *
 * A Customer is NOT an identity: no `appUser` link, no credentials, no
 * database id. The only stable external key is the backend-generated `code`,
 * and `agency_id` is never part of the contract — it is the tenancy the
 * service already scopes by.
 */
export interface CustomerResponse {
  code: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything a customer row needs in one shape. No `agencyId` and no `id` by
 * default; the service widens the select with `id` internally only when it
 * must address a row for a write.
 */
export const CUSTOMER_SELECT = {
  code: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CustomerSelect;

export type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;

export function toCustomerResponse(customer: CustomerRow): CustomerResponse {
  return {
    code: customer.code,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    notes: customer.notes,
    status: customer.status as CustomerStatus,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}