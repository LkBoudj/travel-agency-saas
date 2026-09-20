import { z } from 'zod';
import { BOOKING_STATUSES } from './bookings.types.js';

/**
 * Module I booking contracts.
 *
 * A booking is always scoped by the route's `:agencyCode` — the body never
 * carries a tenant or database reference. The client names its customer,
 * departure and pricing choices by public codes only (`CUS-…`, `DEP-…`,
 * `PRC-…`), and it NEVER supplies amounts, totals or a target status: the
 * backend computes the snapshot from the departure's stored prices and owns
 * every lifecycle move (`confirm`, `cancel` with an optional reason). That is
 * what keeps a booking's ledger trustworthy.
 *
 * `reservedSeats` is the read-only seat claim the booking holds from creation.
 * Capacity itself (open deadline, free seats, departure status) is validated
 * server-side under a departure row lock.
 */

/** A blank string is treated as "no value", never stored as a stub. */
const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? null : value;

const nullableText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.literal(null), z.string().trim().min(1).max(max)]),
  ).optional();

const publicCode = z.string().trim().min(1).max(24);

export const createBookingSchema = z
  .object({
    customerCode: publicCode,
    departureCode: publicCode,
    reservedSeats: z.number().int().positive(),
    pricingSelections: z.array(publicCode).max(50).default([]),
    notes: nullableText(2000),
  })
  .strict()
  .superRefine(({ pricingSelections }, ctx) => {
    const seen = new Set<string>();
    for (const code of pricingSelections) {
      if (seen.has(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pricingSelections'],
          message: 'a pricingOptionCode can only appear once',
        });
        break;
      }
      seen.add(code);
    }
  });

/** Cancellation is the only lifecycle move that takes a (optional) reason. */
export const cancelBookingSchema = z
  .object({
    reason: nullableText(500),
  })
  .strict();

export const listBookingsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
    customerCode: publicCode.optional(),
    departureCode: publicCode.optional(),
  })
  .strict();

export type CreateBookingBody = z.infer<typeof createBookingSchema>;
export type CancelBookingBody = z.infer<typeof cancelBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;