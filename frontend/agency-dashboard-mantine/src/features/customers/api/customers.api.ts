import { apiRequest } from '../../../services/api.ts';
import {
  buildCustomerCreatePayload,
  buildCustomerSearchQuery,
  buildCustomerUpdatePayload,
} from '../lib/customer-payloads.ts';
import type { CustomerFormValues } from '../schemas/customer.schema.ts';
import type { Customer } from '../types.ts';

const customersPath = (agencyCode: string) =>
  `/v1/agencies/${encodeURIComponent(agencyCode)}/customers`;

export function requestCustomers(agencyCode: string, search = ''): Promise<Customer[]> {
  return apiRequest<Customer[]>(`${customersPath(agencyCode)}${buildCustomerSearchQuery(search)}`);
}

export function requestCustomer(agencyCode: string, customerCode: string): Promise<Customer> {
  return apiRequest<Customer>(`${customersPath(agencyCode)}/${encodeURIComponent(customerCode)}`);
}

export function requestCreateCustomer(
  agencyCode: string,
  values: CustomerFormValues
): Promise<Customer> {
  return apiRequest<Customer>(customersPath(agencyCode), {
    method: 'POST',
    body: JSON.stringify(buildCustomerCreatePayload(values)),
  });
}

export function requestUpdateCustomer(
  agencyCode: string,
  customerCode: string,
  values: CustomerFormValues
): Promise<Customer> {
  return apiRequest<Customer>(`${customersPath(agencyCode)}/${encodeURIComponent(customerCode)}`, {
    method: 'PATCH',
    body: JSON.stringify(buildCustomerUpdatePayload(values)),
  });
}

export function requestArchiveCustomer(
  agencyCode: string,
  customerCode: string
): Promise<Customer> {
  return apiRequest<Customer>(
    `${customersPath(agencyCode)}/${encodeURIComponent(customerCode)}/archive`,
    { method: 'PATCH' }
  );
}
