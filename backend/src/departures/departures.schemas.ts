import { z } from 'zod';
import { DEPARTURE_STATUSES } from './departures.types.js';

/**
 * Module G departure contracts.
 *
 * Create and update share the operational fields; update additionally carries
 * the departure status. The departure is always scoped by the route's
 * `:tourCode` — the body never carries a tour or agency reference, and the
 * backend never accepts one.
 *
 * Date validation is enforced server-side (PRD Module G acceptance): `endAt`
 * must be strictly after `startAt`, and a `bookingDeadline`, when present,
 * must not sit after `startAt`. The same rules are mirrored as database CHECK
 * constraints in the `departures_module` migration.
 */

/** A blank string is treated as "no value", never stored as a stub. */
const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? null : value;

const nullableText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.literal(null), z.string().trim().min(1).max(max)]),
  );

/** An ISO-8601 date-time string that actually parses. */
const dateTime = (label: string) =>
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: `${label} must be a valid ISO-8601 date-time`,
  });

const departurePayloadSchema = z
  .object({
    startAt: dateTime('startAt'),
    endAt: dateTime('endAt'),
    capacity: z.number().int().positive(),
    bookingDeadline: dateTime('bookingDeadline').nullable().optional(),
    notes: nullableText(10000),
  })
  .strict()
  .superRefine((departure, ctx) => {
    const addIssue = (path: string, message: string) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message,
      });
    };

    if (Date.parse(departure.endAt) <= Date.parse(departure.startAt)) {
      addIssue('endAt', 'endAt must be strictly after startAt');
    }
    if (
      departure.bookingDeadline != null &&
      Date.parse(departure.bookingDeadline) > Date.parse(departure.startAt)
    ) {
      addIssue('bookingDeadline', 'bookingDeadline must not be after startAt');
    }
  });

export const createDepartureSchema = departurePayloadSchema;

export const updateDepartureSchema = departurePayloadSchema.extend({
  status: z.enum(DEPARTURE_STATUSES),
});

export const listDeparturesQuerySchema = z.object({
  status: z.enum(DEPARTURE_STATUSES).optional(),
});

export type CreateDepartureBody = z.infer<typeof createDepartureSchema>;
export type UpdateDepartureBody = z.infer<typeof updateDepartureSchema>;
export type ListDeparturesQuery = z.infer<typeof listDeparturesQuerySchema>;