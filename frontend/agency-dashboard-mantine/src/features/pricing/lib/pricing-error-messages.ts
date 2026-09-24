import { classifyPricingActionError, type PricingActionFailureKind } from './pricing-errors.ts';

type Translate = (key: string) => string;

const PRICING_ERROR_KEYS: Record<PricingActionFailureKind, string> = {
  'tour-not-found': 'errors.tourNotFound',
  'option-not-found': 'errors.optionNotFound',
  'departure-not-found': 'errors.departureNotFound',
  'name-taken': 'errors.nameTaken',
  'currency-mismatch': 'errors.currencyMismatch',
  'option-inactive': 'errors.optionInactive',
  'already-inactive': 'errors.alreadyInactive',
  'departure-cancelled': 'errors.departureCancelled',
  network: 'errors.network',
  unknown: 'errors.generic',
};

export function getPricingErrorMessage(error: unknown, t: Translate): string {
  return t(PRICING_ERROR_KEYS[classifyPricingActionError(error)]);
}
