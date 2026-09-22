import { ApiError } from '../../../services/api-error.ts';

export type CustomerActionFailureKind = 'not-found' | 'already-archived' | 'network' | 'unknown';

/** Maps customer backend errorCodes to a stable UI failure kind. */
export function classifyCustomerActionError(error: unknown): CustomerActionFailureKind {
  if (error instanceof ApiError && error.code) {
    switch (error.code) {
      case 'CUSTOMER_NOT_FOUND':
        return 'not-found';
      case 'CUSTOMER_ALREADY_ARCHIVED':
        return 'already-archived';
      default:
        return 'unknown';
    }
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}
