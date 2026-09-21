import { z } from 'zod';

/**
 * Module J traveler contracts.
 *
 * A traveler is always scoped by the route's `:agencyCode` + `:bookingCode` —
 * the body never carries a tenant or database reference and never a `code`.
 * `firstName`/`lastName` are required (a traveler names a reserved seat),
 * contact details are optional and a blank string is treated as "no value".
 * Travelers are written only while the parent booking is PENDING; that rule is
 * enforced first by the service (explicit `BOOKING_TRAVELERS_FROZEN`) and
 * backed by the database trigger set in the module migration.
 */

/** Blank strings are treated as "no value"; real strings are trimmed. */
const normalizeText = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const nullableText = (max: number) =>
  z.preprocess(
    normalizeText,
    z.union([z.literal(null), z.string().min(1).max(max)]),
  ).optional();

const nullableEmail = z.preprocess(
  normalizeText,
  z.union([z.literal(null), z.email().toLowerCase().max(255)]),
).optional();

const nameField = z.string().trim().min(1).max(100);

export const addTravelerSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    email: nullableEmail,
    phone: nullableText(32),
    notes: nullableText(2000),
  })
  .strict();

export const updateTravelerSchema = z
  .object({
    firstName: nameField.optional(),
    lastName: nameField.optional(),
    email: nullableEmail,
    phone: nullableText(32),
    notes: nullableText(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys: Array<keyof typeof value> = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'notes',
    ];
    if (!keys.some((key) => value[key] !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'at least one traveler field must be provided',
      });
    }
  });

export type AddTravelerBody = z.infer<typeof addTravelerSchema>;
export type UpdateTravelerBody = z.infer<typeof updateTravelerSchema>;