import { z } from 'zod';

/**
 * Module K payment contracts.
 *
 * A payment is always scoped by the route's `:agencyCode` + `:bookingCode` —
 * the body never carries a tenant, a booking reference or a database id.
 *
 * The body describes money that was ACTUALLY RECEIVED and nothing else:
 * `amount` is the only money the client may send. The currency is NOT accepted
 * from the client — it is copied from the booking, so a booking can only ever
 * be settled in the currency it was priced in and there is no mismatch vector
 * to validate around. Likewise the paid total and the remaining balance are
 * never sent by a client: they are derived server-side from the booking's
 * frozen `totalAmount` and the sum of its payment rows.
 */

/** The largest amount a booking total can express (`DECIMAL(12,2)`). */
const MAX_AMOUNT = 9_999_999_999.99;

/**
 * A positive monetary amount with at most 2 decimal places.
 *
 * The lower bound of 0.01 is what stops a sub-cent value from silently
 * rounding to a zero payment, and the decimal-place refinement runs on the
 * number's own string form so a float artefact (`0.1 + 0.2`) is rejected
 * rather than rounded into money the agency never received.
 */
const amountField = z
  .number()
  .finite()
  .min(0.01, 'amount must be at least 0.01')
  .max(MAX_AMOUNT, `amount must not exceed ${MAX_AMOUNT}`)
  .refine(
    (value) => (String(value).split('.')[1] ?? '').length <= 2,
    'amount must have at most 2 decimal places',
  );

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

/**
 * The payment methods the ledger recognizes. A closed vocabulary keeps the UI
 * able to offer filters without inventing labels; anything else goes into
 * `reference` or `note`.
 */
export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'CHECK',
  'OTHER',
] as const;

export const recordPaymentSchema = z
  .object({
    amount: amountField,
    method: z.enum(PAYMENT_METHODS).optional(),
    reference: nullableText(120),
    /** ISO-8601 instant the money was received; defaults to the recording time. */
    paidAt: z.iso.datetime({ offset: true }).optional(),
    note: nullableText(2000),
  })
  .strict();

export type RecordPaymentBody = z.infer<typeof recordPaymentSchema>;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];