import type { TFunction } from "i18next"
import { z } from "zod"
import { PRICING_BASIS } from "../types/pricing.types"

/**
 * Pricing option add/edit form schema.
 *
 * Mirrors the backend contract: a non-blank description is trimmed, name is
 * required, currency is never typed (it is fixed at creation) and the basis
 * select only offers the two supported charging modes. Messages are localized
 * per active language.
 */
export function createPricingOptionFormSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("trips:validation.pricingOptionNameRequired"))
      .max(100, t("trips:validation.pricingOptionNameMax")),
    description: z.string().max(500, t("trips:validation.pricingOptionDescriptionMax")),
    basis: z.enum(PRICING_BASIS),
  })
}

export type PricingOptionFormValues = z.infer<
  ReturnType<typeof createPricingOptionFormSchema>
>

/**
 * Per-departure prices form schema.
 *
 * One row per ACTIVE option; the amount is free text because clearing a price
 * must be possible. An empty amount is valid (it means "no price for this
 * option"); anything typed must be a positive money amount with at most two
 * decimal places, matching the backend's DECIMAL(12,2) column.
 */
export function createDeparturePricesFormSchema(t: TFunction) {
  return z
    .object({
      prices: z.array(
        z.object({
          pricingOptionCode: z.string(),
          amount: z.string(),
        })
      ),
    })
    .superRefine(({ prices }, ctx) => {
      prices.forEach((row, index) => {
        const amount = row.amount.trim()
        if (amount === "") return
        const value = Number(amount)
        if (!Number.isFinite(value) || value <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["prices", index, "amount"],
            message: t("trips:validation.pricePositive"),
          })
        } else if (parseFloat(value.toFixed(2)) !== value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["prices", index, "amount"],
            message: t("trips:validation.priceDecimals"),
          })
        }
      })
    })
}

export type DeparturePricesFormValues = z.infer<
  ReturnType<typeof createDeparturePricesFormSchema>
>