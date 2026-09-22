import { classifyCustomerActionError, type CustomerActionFailureKind } from './customer-errors.ts';

type Translate = (key: string) => string;

const CUSTOMER_ERROR_KEYS: Record<CustomerActionFailureKind, string> = {
  'not-found': 'errors.notFound',
  'already-archived': 'errors.alreadyArchived',
  network: 'errors.network',
  unknown: 'errors.generic',
};

export function getCustomerErrorMessage(error: unknown, t: Translate): string {
  return t(CUSTOMER_ERROR_KEYS[classifyCustomerActionError(error)]);
}
