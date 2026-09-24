export type PricingBasis = 'per_person' | 'per_booking';
export type PricingOptionStatus = 'ACTIVE' | 'INACTIVE';

/** A named, currency-fixed price line on a tour. Codes are `PRC-…`. */
export interface PricingOption {
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

/** The pricing dashboard payload for a tour: options plus a few derived numbers. */
export interface PricingOverview {
  options: PricingOption[];
  startingPrice: number | null;
  pricedOpenDepartureCount: number;
}

/** One price stored for a single departure/option pair. */
export interface DeparturePriceItem {
  pricingOptionCode: string;
  pricingOptionName: string;
  basis: PricingBasis;
  currency: string;
  amount: number;
  active: boolean;
}

/** The whole-set price payload of one departure (all options). */
export interface DeparturePriceSet {
  departureCode: string;
  currency: string | null;
  prices: DeparturePriceItem[];
}
