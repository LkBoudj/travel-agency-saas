import { ApiError } from '../../../services/api-error.ts';

export type PricingActionFailureKind =
  | 'tour-not-found'
  | 'option-not-found'
  | 'departure-not-found'
  | 'name-taken'
  | 'currency-mismatch'
  | 'option-inactive'
  | 'already-inactive'
  | 'departure-cancelled'
  | 'network'
  | 'unknown';

/** Maps pricing backend errorCodes to a stable UI failure kind. */
export function classifyPricingActionError(error: unknown): PricingActionFailureKind {
  if (error instanceof ApiError && error.code) {
    switch (error.code) {
      case 'TOUR_NOT_FOUND':
        return 'tour-not-found';
      case 'PRICING_OPTION_NOT_FOUND':
        return 'option-not-found';
      case 'DEPARTURE_NOT_FOUND':
        return 'departure-not-found';
      case 'PRICING_OPTION_NAME_TAKEN':
        return 'name-taken';
      case 'PRICING_CURRENCY_MISMATCH':
        return 'currency-mismatch';
      case 'PRICING_OPTION_INACTIVE':
        return 'option-inactive';
      case 'PRICING_OPTION_ALREADY_INACTIVE':
        return 'already-inactive';
      case 'DEPARTURE_ALREADY_CANCELLED':
        return 'departure-cancelled';
      default:
        return 'unknown';
    }
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}
