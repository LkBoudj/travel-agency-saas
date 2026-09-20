import type { Prisma } from '../generated/prisma/client.js';

/**
 * Pricing basis vocabulary, enforced by the `pricing_option_basis_check`
 * constraint. `per_person` prices price one traveler; `per_booking` prices one
 * booking (e.g. a single-room supplement applied once). Applying the basis to
 * booking totals belongs to the Bookings module — this module only stores it.
 */
export const PRICING_BASIS = ['per_person', 'per_booking'] as const;
export type PricingBasis = (typeof PRICING_BASIS)[number];

/**
 * Lifecycle vocabulary enforced by the `pricing_option_status_check`
 * constraint. A new option always starts ACTIVE and deactivation (mirroring
 * tour ARCHIVED / departure CANCELLED) is one-way.
 */
export const PRICING_OPTION_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type PricingOptionStatus = (typeof PRICING_OPTION_STATUSES)[number];

/**
 * The public shape of a pricing option definition.
 *
 * No database id, no `tourId` and no `agencyId` in the contract: `code`
 * (`PRC-...`) is the only stable external key and tenancy is `:agencyCode`
 * plus the `:tourCode` the service already scopes by. `pricedDepartureCount`
 * is the number of departures that currently carry a stored price for this
 * option (zero for a fresh definition).
 */
export interface PricingOptionResponse {
  code: string;
  name: string;
  description: string | null;
  basis: PricingBasis;
  currency: string;
  status: PricingOptionStatus;
  pricedDepartureCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * What a tour's pricing overview returns: the options plus the two derived
 * numbers the dashboard needs to render the pricing section and the readiness
 * panel without extra round-trips.
 */
export interface PricingOptionsOverviewResponse {
  options: PricingOptionResponse[];
  /** The minimum price among the tour's OPEN departures, or null when none. */
  startingPrice: number | null;
  /** Distinct OPEN departures that carry at least one price. */
  pricedOpenDepartureCount: number;
}

/** One stored price on a departure, joined with its option definition. */
export interface DeparturePriceResponse {
  pricingOptionCode: string;
  pricingOptionName: string;
  basis: PricingBasis;
  currency: string;
  amount: number;
  active: boolean;
}

/** The price set of one departure, managed as a whole. */
export interface DeparturePriceSetResponse {
  departureCode: string;
  /** The single currency of the set; null while the set is empty. */
  currency: string | null;
  prices: DeparturePriceResponse[];
}

export const PRICING_OPTION_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  basis: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.PricingOptionSelect;

export type PricingOptionRow = Prisma.PricingOptionGetPayload<{
  select: typeof PRICING_OPTION_SELECT;
}>;

/**
 * The minimum option shape the price-set flow needs to validate and build
 * its rows: identity plus the fields echoed into `DeparturePriceResponse`.
 */
export const PRICING_OPTION_REFERENCE_SELECT = {
  id: true,
  code: true,
  name: true,
  basis: true,
  currency: true,
  status: true,
} as const satisfies Prisma.PricingOptionSelect;

export type PricingOptionReference = Prisma.PricingOptionGetPayload<{
  select: typeof PRICING_OPTION_REFERENCE_SELECT;
}>;

export function toPricingOptionResponse(
  option: PricingOptionRow,
  pricedDepartureCount: number,
): PricingOptionResponse {
  return {
    code: option.code,
    name: option.name,
    description: option.description,
    basis: option.basis as PricingBasis,
    currency: option.currency,
    status: option.status as PricingOptionStatus,
    pricedDepartureCount,
    createdAt: option.createdAt.toISOString(),
    updatedAt: option.updatedAt.toISOString(),
  };
}