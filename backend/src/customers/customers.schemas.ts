import { z } from 'zod';

/**
 * A conditional clear on an optional field:
 *
 * - absent (undefined) → leave untouched (only meaningful for updates),
 * - `null` → explicitly clear the value,
 * - blank string → treated as `null`, so an empty form field never creates a
 *   data stub. Email is lowercased here so the stored value is canonical no
 *   matter how the agency types it (the column is CITEXT on top).
 */
const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? null : value;

/**
 * A valid email, trimmed and lowercased. Leading/trailing whitespace from a
 * form field is tolerated and removed rather than rejected, matching how the
 * service normalizes a stored value.
 */
const nullableEmailSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string' || value.trim().length === 0) return null;
    return value.trim();
  },
  z.union([z.literal(null), z.email().toLowerCase()]),
);

const nullableTextSchema = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.literal(null), z.string().trim().min(1).max(max)]),
  );

/**
 * All fields are optional by design: a customer can be a bare name, a bare
 * phone number, or anything in between. The same object shape is used by
 * create (absent field → stored as no value) and update (absent field → left
 * untouched, `null`/blank → cleared), which is why the optional-key behavior is
 * the contract and not a side effect.
 */
const customerFields = {
  firstName: nullableTextSchema(100).nullish(),
  lastName: nullableTextSchema(100).nullish(),
  email: nullableEmailSchema.nullish(),
  phone: nullableTextSchema(32).nullish(),
  notes: nullableTextSchema(2000).nullish(),
};

export const createCustomerSchema = z.object(customerFields).strict();

export type CreateCustomerBody = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object(customerFields).strict();

export type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>;

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

/**
 * Normalizes a customer email before persistence. `undefined` is passed
 * through untouched so a partial update skips the field instead of clearing it.
 */
export function normalizeCustomerEmail(email: string | null | undefined): string | null | undefined {
  if (email === undefined || email === null) {
    return email;
  }
  const trimmed = email.trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
}