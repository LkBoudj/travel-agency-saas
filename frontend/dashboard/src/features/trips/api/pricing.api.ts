import { apiRequest } from "@/lib/api"
import type {
  CreatePricingOptionPayload,
  DeparturePriceSet,
  PricingOption,
  PricingOptionsOverview,
  ReplaceDeparturePricesPayload,
  UpdatePricingOptionPayload,
} from "../types/pricing.types"

/**
 * Query keys.
 *
 * Pricing belongs to one tour, so every key sits under the tour's detail
 * slice — a mutation here refetches this tour's pricing only, and never
 * touches another agency's (or another tour's) cache.
 */
export const pricingQueryKeys = {
  all: (agencyCode: string, tourCode: string) =>
    [
      "agency",
      agencyCode,
      "tours",
      "detail",
      tourCode,
      "pricing",
    ] as const,
  overview: (agencyCode: string, tourCode: string) =>
    [
      ...pricingQueryKeys.all(agencyCode, tourCode),
      "overview",
    ] as const,
  option: (
    agencyCode: string,
    tourCode: string,
    pricingOptionCode: string
  ) =>
    [
      ...pricingQueryKeys.all(agencyCode, tourCode),
      "detail",
      pricingOptionCode,
    ] as const,
  departurePrices: (
    agencyCode: string,
    tourCode: string,
    departureCode: string
  ) =>
    [
      ...pricingQueryKeys.all(agencyCode, tourCode),
      "departure",
      departureCode,
      "prices",
    ] as const,
}

function base(agencyCode: string, tourCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}/tours/${encodeURIComponent(tourCode)}`
}

function pricingPath(agencyCode: string, tourCode: string): string {
  return `${base(agencyCode, tourCode)}/pricing-options`
}

function departurePricesPath(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): string {
  return `${base(agencyCode, tourCode)}/departures/${encodeURIComponent(departureCode)}/prices`
}

/** The tour's options plus its derived starting price/count, in one call. */
export function getPricingOverview(
  agencyCode: string,
  tourCode: string
): Promise<PricingOptionsOverview> {
  return apiRequest<PricingOptionsOverview>(pricingPath(agencyCode, tourCode))
}

/** Reads one option by code; deactivated options remain readable. */
export function getPricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string
): Promise<PricingOption> {
  return apiRequest<PricingOption>(
    `${pricingPath(agencyCode, tourCode)}/${encodeURIComponent(pricingOptionCode)}`
  )
}

/** Creates an ACTIVE option — the backend always starts it ACTIVE. */
export function createPricingOption(
  agencyCode: string,
  tourCode: string,
  payload: CreatePricingOptionPayload
): Promise<PricingOption> {
  return apiRequest<PricingOption>(pricingPath(agencyCode, tourCode), {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Replaces the editable definition while ACTIVE (409 once deactivated). */
export function updatePricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string,
  payload: UpdatePricingOptionPayload
): Promise<PricingOption> {
  return apiRequest<PricingOption>(
    `${pricingPath(agencyCode, tourCode)}/${encodeURIComponent(pricingOptionCode)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  )
}

/**
 * One-way soft-action, like archiving a tour: ACTIVE → INACTIVE. There is no
 * reactivation; already-priced departures keep their stored history.
 */
export function deactivatePricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string
): Promise<PricingOption> {
  return apiRequest<PricingOption>(
    `${pricingPath(agencyCode, tourCode)}/${encodeURIComponent(pricingOptionCode)}/deactivate`,
    { method: "POST" }
  )
}

/** Reads one departure's whole price set (CANCELLED departures stay readable). */
export function getDeparturePrices(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): Promise<DeparturePriceSet> {
  return apiRequest<DeparturePriceSet>(
    departurePricesPath(agencyCode, tourCode, departureCode)
  )
}

/**
 * Replaces the whole price set of one departure in one transaction — the
 * tour's `startingPrice` is derived from these rows, so the tours queries
 * must be invalidated alongside the pricing slice.
 */
export function setDeparturePrices(
  agencyCode: string,
  tourCode: string,
  departureCode: string,
  payload: ReplaceDeparturePricesPayload
): Promise<DeparturePriceSet> {
  return apiRequest<DeparturePriceSet>(
    departurePricesPath(agencyCode, tourCode, departureCode),
    { method: "PUT", body: JSON.stringify(payload) }
  )
}