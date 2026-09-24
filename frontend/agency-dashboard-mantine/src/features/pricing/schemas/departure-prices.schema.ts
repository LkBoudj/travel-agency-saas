import { z } from 'zod';

/**
 * The per-departure prices form.
 *
 * One row per ACTIVE option; the amount is free text because clearing a price
 * must be possible. An empty amount is valid (it means "no price for this
 * option"); anything typed must be a positive money amount with at most two
 * decimal places, matching the backend's DECIMAL(12,2) column.
 *
 * Issues collapse to the top-level `prices` field (the app-wide resolver keeps
 * only the first issue per top-level field), so the form surfaces a single
 * inline error rather than per-row ones.
 */
export const departurePricesSchema = z
  .object({
    prices: z.array(
      z.object({
        pricingOptionCode: z.string().min(1),
        amount: z.string().trim(),
      })
    ),
  })
  .strict()
  .superRefine(({ prices }, ctx) => {
    for (const row of prices) {
      if (row.amount === '') {
        continue;
      }
      const value = Number(row.amount);
      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.abs(value * 100 - Math.round(value * 100)) > 1e-9
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['prices'],
          message: 'invalid amount',
        });
        return;
      }
    }
  });

export type DeparturePricesFormValues = z.infer<typeof departurePricesSchema>;
