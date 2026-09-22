import type { CustomerFormValues } from '../schemas/customer.schema.ts';

export interface CustomerFormPayload {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

function buildCustomerPayload(values: CustomerFormValues): CustomerFormPayload {
  return {
    firstName: blankToNull(values.firstName),
    lastName: blankToNull(values.lastName),
    email: blankToNull(values.email)?.toLowerCase() ?? null,
    phone: blankToNull(values.phone),
    notes: blankToNull(values.notes),
  };
}

/** The exact body the POST /customers endpoint accepts (blank → null). */
export function buildCustomerCreatePayload(values: CustomerFormValues): CustomerFormPayload {
  return buildCustomerPayload(values);
}

/** The exact body the PATCH /customers/:code endpoint accepts (blank clears). */
export function buildCustomerUpdatePayload(values: CustomerFormValues): CustomerFormPayload {
  return buildCustomerPayload(values);
}

/** Query string for the customer list endpoint; empty when the search is blank. */
export function buildCustomerSearchQuery(search: string): string {
  const trimmed = search.trim();
  return trimmed ? `?search=${encodeURIComponent(trimmed)}` : '';
}
