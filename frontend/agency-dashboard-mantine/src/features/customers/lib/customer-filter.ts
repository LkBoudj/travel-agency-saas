import type { Customer, CustomerStatus } from '../types.ts';

export type CustomerStatusFilter = CustomerStatus | 'all';

/**
 * The status filter, applied to the rows already in hand.
 *
 * The customers query has no status parameter, and this does not add one: the
 * list the page fetched is filtered client-side, so the filter can never disagree
 * with what the backend returned or invent rows.
 */
export function filterCustomersByStatus(
  customers: readonly Customer[],
  status: CustomerStatusFilter
): Customer[] {
  return status === 'all'
    ? [...customers]
    : customers.filter((customer) => customer.status === status);
}
