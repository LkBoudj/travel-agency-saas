/**
 * Backend pricing contracts, mirrored from `backend/src/pricing`.
 *
 * A PricingOption is a tour-owned customer category (Adult, Child, …). Like
 * every other aggregation it never carries an agency or database id on the
 * wire: it is scoped by the route's `:agencyCode` + `:tourCode`, and its only
 * stable external key is the backend-generated `pricingOptionCode` (`PRC-…`).
 *
 * The actual money lives on `DeparturePrice`, one row per (departure, option)
 * pair, managed as a whole set per departure. A tour keeps a single currency
 * (default `DZD`), fixed at the first option's creation and immutable after.
 *
 * Statuses are the backend's uppercase vocabulary. Options are one-way like
 * tours: `ACTIVE → INACTIVE` through the deactivate action, never back.
 */
export const PRICING_BASIS = ["per_person", "per_booking"] as const
export type PricingBasis = (typeof PRICING_BASIS)[number]

export type PricingOptionStatus = "ACTIVE" | "INACTIVE"

/** One pricing option, from `GET .../pricing-options` (both statuses are listed). */
export type PricingOption = {
  pricingOptionCode: string
  name: string
  description: string | null
  basis: PricingBasis
  currency: string
  status: PricingOptionStatus
  /** How many departures hold a price for this option (persisted history). */
  pricedDepartureCount: number
  createdAt: string
  updatedAt: string
}

/** The tour's pricing overview: options plus the derived starting values. */
export type PricingOptionsOverview = {
  options: PricingOption[]
  /** Min amount across the tour's OPEN departures; null when none priced. */
  startingPrice: number | null
  /** How many OPEN departures carry at least one price. */
  pricedOpenDepartureCount: number
}

/** Create: name/description/basis (+ optional currency, backend defaults DZD). */
export type CreatePricingOptionPayload = {
  name: string
  description: string | null
  basis: PricingBasis
  currency?: string
}

/** Update: full replacement of the editable definition, never the currency. */
export type UpdatePricingOptionPayload = {
  name: string
  description: string | null
  basis: PricingBasis
}

/** One stored price on a departure, enriched with its option's display data. */
export type DeparturePrice = {
  pricingOptionCode: string
  pricingOptionName: string
  basis: PricingBasis
  currency: string
  amount: number
  /** False when the option has since been deactivated (history kept). */
  active: boolean
}

/** The whole price set of one departure. */
export type DeparturePriceSet = {
  departureCode: string
  currency: string | null
  prices: DeparturePrice[]
}

/** Whole-set replacement: every entry names an option by its `PRC-…` code. */
export type ReplaceDeparturePricesPayload = {
  prices: Array<{ pricingOptionCode: string; amount: number }>
}