import { apiRequest } from '../../../services/api.ts';
import {
  buildDeparturePricesPayload,
  buildPricingOptionCreatePayload,
  buildPricingOptionUpdatePayload,
  type DeparturePriceRow,
} from '../lib/pricing-payloads.ts';
import type {
  PricingOptionCreateValues,
  PricingOptionEditValues,
} from '../schemas/pricing-option.schema.ts';
import type { DeparturePriceSet, PricingOption, PricingOverview } from '../types.ts';

function base(agencyCode: string, tourCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}/tours/${encodeURIComponent(tourCode)}`;
}

function pricingPath(agencyCode: string, tourCode: string): string {
  return `${base(agencyCode, tourCode)}/pricing-options`;
}

function departurePricesPath(agencyCode: string, tourCode: string, departureCode: string): string {
  return `${base(agencyCode, tourCode)}/departures/${encodeURIComponent(departureCode)}/prices`;
}

/** The tour's options plus its derived starting price/count, in one call. */
export function requestPricingOverview(
  agencyCode: string,
  tourCode: string
): Promise<PricingOverview> {
  return apiRequest<PricingOverview>(pricingPath(agencyCode, tourCode));
}

/** Reads one option by code; deactivated options remain readable. */
export function requestPricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string
): Promise<PricingOption> {
  return apiRequest<PricingOption>(
    `${pricingPath(agencyCode, tourCode)}/${encodeURIComponent(pricingOptionCode)}`
  );
}

/** Creates an ACTIVE option — the backend always starts it ACTIVE. */
export function requestCreatePricingOption(
  agencyCode: string,
  tourCode: string,
  values: PricingOptionCreateValues
): Promise<PricingOption> {
  return apiRequest<PricingOption>(pricingPath(agencyCode, tourCode), {
    method: 'POST',
    body: JSON.stringify(buildPricingOptionCreatePayload(values)),
  });
}

/** Replaces the editable definition while ACTIVE (409 once deactivated). */
export function requestUpdatePricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string,
  values: PricingOptionEditValues
): Promise<PricingOption> {
  return apiRequest<PricingOption>(
    `${pricingPath(agencyCode, tourCode)}/${encodeURIComponent(pricingOptionCode)}`,
    { method: 'PUT', body: JSON.stringify(buildPricingOptionUpdatePayload(values)) }
  );
}

/**
 * One-way soft-action, like archiving a tour: ACTIVE → INACTIVE. There is no
 * reactivation; already-priced departures keep their stored history.
 */
export function requestDeactivatePricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string
): Promise<PricingOption> {
  return apiRequest<PricingOption>(
    `${pricingPath(agencyCode, tourCode)}/${encodeURIComponent(pricingOptionCode)}/deactivate`,
    { method: 'POST' }
  );
}

/** Reads one departure's whole price set (CANCELLED departures stay readable). */
export function requestDeparturePrices(
  agencyCode: string,
  tourCode: string,
  departureCode: string
): Promise<DeparturePriceSet> {
  return apiRequest<DeparturePriceSet>(departurePricesPath(agencyCode, tourCode, departureCode));
}

/**
 * Replaces the whole price set of one departure in one transaction — the
 * tour's `startingPrice` is derived from these rows, so the tours queries
 * must be invalidated alongside the pricing slice.
 */
export function requestSetDeparturePrices(
  agencyCode: string,
  tourCode: string,
  departureCode: string,
  rows: ReadonlyArray<DeparturePriceRow>
): Promise<DeparturePriceSet> {
  return apiRequest<DeparturePriceSet>(departurePricesPath(agencyCode, tourCode, departureCode), {
    method: 'PUT',
    body: JSON.stringify(buildDeparturePricesPayload(rows)),
  });
}
