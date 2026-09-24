import type { PricingBasis, PricingOptionStatus } from '../types';

/** The ACTIVE options of a tour — the ones new price sets can still use. */
export function activeOptionCount(options: ReadonlyArray<{ status: PricingOptionStatus }>): number {
  return options.filter((option) => option.status === 'ACTIVE').length;
}

/** i18n key for the human label of a pricing basis. */
export function pricingBasisLabelKey(basis: PricingBasis): string {
  return `pricing.basis.${basis}`;
}

/** i18n key for a pricing option status. Statuses live in the common namespace. */
export function pricingOptionStatusKey(status: PricingOptionStatus): string {
  return `common.statuses.${status.toLowerCase()}`;
}
