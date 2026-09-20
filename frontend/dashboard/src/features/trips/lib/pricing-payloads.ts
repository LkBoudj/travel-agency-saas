import type {
  DeparturePriceSet,
  PricingBasis,
  PricingOption,
} from "../types/pricing.types"

/**
 * Mapping between the pricing forms and the Pricing API.
 *
 * Pure functions, no React, no `@/` imports — loaded directly by `node --test`.
 *
 * The option form edits plain strings; blank description means "no value",
 * never a stored `""` stub. The departure prices form keeps one row per ACTIVE
 * option with a free-text amount: an empty amount means "clear this option's
 * price" and is dropped before the whole-set replacement is sent.
 */

/** A blank form field means "no value", never a stored `""` stub. */
function descriptionToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/** Starts the option form from a blank definition. */
export function emptyPricingOptionForm(): {
  name: string
  description: string
  basis: PricingBasis
} {
  return { name: "", description: "", basis: "per_person" }
}

/** Starts the edit form from a stored option. */
export function toPricingOptionFormValues(
  option: PricingOption
): { name: string; description: string; basis: PricingBasis } {
  return {
    name: option.name,
    description: option.description ?? "",
    basis: option.basis,
  }
}

/** Create payload; `currency` is omitted so the backend applies its DZD default. */
export function buildPricingOptionPayload(form: {
  name: string
  description: string
  basis: PricingBasis
}): { name: string; description: string | null; basis: PricingBasis } {
  return {
    name: form.name.trim(),
    description: descriptionToNull(form.description),
    basis: form.basis,
  }
}

/** One editable row of the per-departure prices form. */
export type DeparturePriceRow = {
  pricingOptionCode: string
  amount: string
}

/**
 * One row per ACTIVE option, prefilled with the departure's current price for
 * that option. INACTIVE options are intentionally absent: their stored prices
 * are history and cannot be part of a new price set.
 */
export function toDeparturePriceRows(
  options: PricingOption[],
  priceSet: DeparturePriceSet | undefined
): DeparturePriceRow[] {
  const amounts = new Map(
    (priceSet?.prices ?? []).map((price) => [
      price.pricingOptionCode,
      price.amount,
    ])
  )
  return options
    .filter((option) => option.status === "ACTIVE")
    .map((option) => ({
      pricingOptionCode: option.pricingOptionCode,
      amount: amounts.has(option.pricingOptionCode)
        ? String(amounts.get(option.pricingOptionCode))
        : "",
    }))
}

/**
 * Whole-set replacement. Only rows that actually carry an amount are sent —
 * an empty row means the backend drops (clears) that option's price as part
 * of the delete-many/create-many replacement. Rows are guaranteed valid by
 * the form schema, so the filter is purely "skip empties".
 */
export function buildDeparturePricesPayload(
  rows: DeparturePriceRow[]
): { prices: Array<{ pricingOptionCode: string; amount: number }> } {
  return {
    prices: rows
      .map((row) => ({
        pricingOptionCode: row.pricingOptionCode,
        amount: Number(row.amount.trim()),
      }))
      .filter((row) => Number.isFinite(row.amount) && row.amount > 0),
  }
}