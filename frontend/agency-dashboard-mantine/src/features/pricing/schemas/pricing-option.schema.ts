import { z } from 'zod';

/** Create + edit share these fields. `currency` is create-only (see below); it is
 *  still safe-parsed so the same `useZodForm` handles both modes. */
const optionFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  basis: z.enum(['per_person', 'per_booking']),
};

export const pricingOptionFieldsSchema = z.object(optionFields).strict();

/** Create form: currency is required to be a 3-letter code, or blank to let the
 *  backend default (DZD). Uppercased only when building the payload. */
export const pricingOptionCreateSchema = z
  .object({
    ...optionFields,
    currency: z
      .string()
      .trim()
      .refine((value) => value === '' || /^[a-zA-Z]{3}$/.test(value), {
        message: 'currency must be a 3-letter code',
      }),
    status: z.literal('ACTIVE').optional(),
  })
  .strict();

/** Edit form: currency is immutable after creation, so it is not part of the payload. */
export const pricingOptionEditSchema = pricingOptionFieldsSchema;

export type PricingOptionFormValues = z.infer<typeof pricingOptionCreateSchema>;
export type PricingOptionCreateValues = z.infer<typeof pricingOptionCreateSchema>;
export type PricingOptionEditValues = z.infer<typeof pricingOptionEditSchema>;
