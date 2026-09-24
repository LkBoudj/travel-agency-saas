import { z } from 'zod';

/**
 * Create-booking form schema.
 *
 * Validation lives here, never in `onSubmit`. `tourCode` is form-only — the
 * backend is addressed by the departure's code, which is scoped inside the
 * tour — so it is validated (you must pick one) but never sent.
 * `pricingSelections` holds only the `PRC-...` codes the operator ticked on
 * the chosen departure; the server recomputes every amount. A blank notes
 * field becomes `null` in the payload, matching the backend's clear-semantics.
 *
 * Messages are i18n keys resolved through the form's `fieldErrorKeys`; the
 * duplicates refine surfaces a `custom` issue that the resolver maps to the
 * field's invalid key.
 */
export const createBookingFormSchema = z
  .object({
    customerCode: z.string().trim().min(1, 'validation.customerRequired'),
    tourCode: z.string().trim().min(1, 'validation.tourRequired'),
    departureCode: z.string().trim().min(1, 'validation.departureRequired'),
    reservedSeats: z
      .string()
      .trim()
      .min(1, 'validation.seatsRequired')
      .refine((value) => {
        const seats = Number(value);
        return Number.isInteger(seats) && seats > 0;
      }, 'validation.seatsInvalid'),
    pricingSelections: z
      .array(z.string().trim().min(1))
      .max(50)
      .superRefine((codes, ctx) => {
        const seen = new Set<string>();
        for (const code of codes) {
          if (seen.has(code)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['pricingSelections'],
              message: 'validation.pricingDuplicate',
            });
            break;
          }
          seen.add(code);
        }
      }),
    notes: z.string().trim().max(2000, 'validation.notesMax'),
  })
  .strict();

export type BookingFormValues = z.infer<typeof createBookingFormSchema>;

/**
 * Add/edit form schema for one traveler of a PENDING booking.
 *
 * Names are required (a traveler always names its seat — the backend also
 * enforces this at the database). Contact details are optional: an untouched
 * blank stays a blank in the form and only becomes a stored `null` when the
 * payload is built, matching the backend's clear-semantics.
 */
export const travelerFormSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'travelers.validation.firstNameRequired')
      .max(100, 'travelers.validation.nameMax'),
    lastName: z
      .string()
      .trim()
      .min(1, 'travelers.validation.lastNameRequired')
      .max(100, 'travelers.validation.nameMax'),
    email: z.union([
      z.literal(''),
      z
        .string()
        .trim()
        .email('travelers.validation.emailInvalid')
        .max(255, 'travelers.validation.emailInvalid'),
    ]),
    phone: z.string().trim().max(32, 'travelers.validation.phoneMax'),
    notes: z.string().trim().max(2000, 'travelers.validation.notesMax'),
  })
  .strict();

export type TravelerFormValues = z.infer<typeof travelerFormSchema>;
