import type {
  PricingOptionCreateValues,
  PricingOptionEditValues,
} from '../schemas/pricing-option.schema.ts';
import type { PricingBasis, PricingOption, DeparturePriceSet } from '../types.ts';

export type { PricingBasis };

export interface PricingOptionCreatePayload {
  name: string;
  description: string | null;
  basis: PricingBasis;
  currency?: string;
}

export interface PricingOptionUpdatePayload {
  name: string;
  description: string | null;
  basis: PricingBasis;
}

/** One editable row of the per-departure prices form. */
export interface DeparturePriceRow {
  pricingOptionCode: string;
  amount: string;
}

export interface PriceRow {
  pricingOptionCode: string;
  amount: number;
}

export interface DeparturePricesPayload {
  prices: PriceRow[];
}

/** Starts the option form from a blank definition (create mode includes currency). */
export function emptyPricingOptionForm(): PricingOptionCreateValues {
  return { name: '', description: '', basis: 'per_person', currency: '', status: 'ACTIVE' };
}

/** Starts the edit form from a stored option. Currency is immutable after creation. */
export function toPricingOptionFormValues(option: PricingOption): PricingOptionCreateValues {
  return {
    name: option.name,
    description: option.description ?? '',
    basis: option.basis,
    currency: option.currency,
    status: 'ACTIVE',
  };
}

/** The exact body the POST /tours/:tourCode/pricing-options endpoint accepts. */
export function buildPricingOptionCreatePayload(
  values: PricingOptionCreateValues
): PricingOptionCreatePayload {
  const currency = values.currency.trim().toUpperCase();
  const payload: PricingOptionCreatePayload = {
    name: values.name.trim(),
    description: toNullableText(values.description),
    basis: values.basis,
  };
  if (currency.length > 0) {
    payload.currency = currency;
  }
  return payload;
}

/** The exact body the PUT /tours/:tourCode/pricing-options/:code endpoint accepts. */
export function buildPricingOptionUpdatePayload(
  values: PricingOptionEditValues
): PricingOptionUpdatePayload {
  return {
    name: values.name.trim(),
    description: toNullableText(values.description),
    basis: values.basis,
  };
}

/**
 * One row per ACTIVE option, prefilled with the departure's current price for
 * that option. INACTIVE options are intentionally absent: their stored prices
 * are history and cannot be part of a new price set.
 */
export function toDeparturePriceRows(
  options: ReadonlyArray<PricingOption>,
  priceSet: DeparturePriceSet | undefined
): DeparturePriceRow[] {
  const amounts = new Map(
    (priceSet?.prices ?? []).map((price) => [price.pricingOptionCode, price.amount])
  );
  return options
    .filter((option) => option.status === 'ACTIVE')
    .map((option) => ({
      pricingOptionCode: option.code,
      amount: amounts.has(option.code) ? String(amounts.get(option.code)) : '',
    }));
}

/**
 * Normalizes a price amount from a `<NumberInput>` value. Blanks and
 * non-positive numbers collapse to `null`; valid amounts keep at most two
 * decimals.
 */
export function normalizePriceAmount(raw: number | string): number | null {
  const amount = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
  if (!Number.isFinite(amount) || amount <= 0 || !hasAtMostTwoDecimals(amount)) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

/** Builds the whole-set prices body: one row per option that has a valid amount. */
export function buildDeparturePricesPayload(
  rows: ReadonlyArray<DeparturePriceRow>
): DeparturePricesPayload {
  const prices: PriceRow[] = [];
  for (const row of rows) {
    const amount = normalizePriceAmount(row.amount);
    if (amount === null) {
      continue;
    }
    prices.push({ pricingOptionCode: row.pricingOptionCode, amount });
  }
  return { prices };
}

function hasAtMostTwoDecimals(amount: number): boolean {
  return Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-9;
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
