import { z } from 'zod';
import { PRICING_BASIS } from './pricing.types.js';

/**
 * Module H pricing contracts.
 *
 * A PricingOption is always scoped by the route's `:tourCode` — the body never
 * carries a tour or agency reference, and the backend never accepts one.
 * `status` is never accepted either: a new option always lands ACTIVE and the
 * only lifecycle move is the explicit deactivate action.
 *
 * Currency is set at creation (defaulting to `DZD`) and immutable afterwards,
 * keeping every price of a tour in one currency (the service enforces the
 * single-currency rule across the tour).
 *
 * A departure's prices are managed as a whole set (`PUT` replaces the set, like
 * the tour aggregate's children): each entry names an option by its public
 * `PRC-...` code and a positive amount with at most two decimal places,
 * bounded the same way the DECIMAL(12,2) column bounds what can be stored.
 */

/** A blank string is treated as "no value", never stored as a stub. */
const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? null : value;

const nullableText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.literal(null), z.string().trim().min(1).max(max)]),
  ).optional();

const CURRENCY_CODE = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter uppercase code');

export const createPricingOptionSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: nullableText(500),
    basis: z.enum(PRICING_BASIS),
    currency: CURRENCY_CODE.optional(),
  })
  .strict();

/**
 * Full replacement of the editable definition. Currency is deliberately absent
 * from this contract: it is fixed at creation so stored prices are never
 * ambiguous, and `status` moves only through deactivate.
 */
export const updatePricingOptionSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: nullableText(500),
    basis: z.enum(PRICING_BASIS),
  })
  .strict();

/** A positive money amount with at most two decimal places, DECIMAL(12,2)-safe. */
const priceAmount = z
  .number()
  .positive()
  .max(9999999999.99)
  .refine((value) => parseFloat(value.toFixed(2)) === value, {
    message: 'amount must have at most 2 decimal places',
  });

export const replaceDeparturePricesSchema = z
  .object({
    prices: z
      .array(
        z
          .object({
            pricingOptionCode: z.string().trim().min(1).max(24),
            amount: priceAmount,
          })
          .strict(),
      )
      .max(50),
  })
  .strict()
  .superRefine(({ prices }, ctx) => {
    const seen = new Set<string>();
    for (const price of prices) {
      if (seen.has(price.pricingOptionCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['prices'],
          message: 'a pricingOptionCode can only appear once',
        });
        break;
      }
      seen.add(price.pricingOptionCode);
    }
  });

export type CreatePricingOptionBody = z.infer<typeof createPricingOptionSchema>;
export type UpdatePricingOptionBody = z.infer<typeof updatePricingOptionSchema>;
export type ReplaceDeparturePricesBody = z.infer<typeof replaceDeparturePricesSchema>;