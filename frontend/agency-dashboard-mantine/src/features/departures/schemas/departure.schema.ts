import { z } from 'zod';

/** A date-time picker field. When `required`, an empty string is rejected
 *  (`too_small`); otherwise a blank means "no date". Everything that survives
 *  the blank rule must parse as a date-time. */
function dateTimeField(required: boolean) {
  const base = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    required ? z.string().min(1) : z.string()
  );
  return base.refine((value) => value.length === 0 || !Number.isNaN(Date.parse(value)), {
    message: 'invalid date-time',
  });
}

/**
 * The departure form. Dates are kept as picker strings (`YYYY-MM-DD HH:mm:ss`
 * from DateTimePicker) and normalized to ISO in the payload builder. The two
 * date rules mirror the backend: `endAt` strictly after `startAt`, and the
 * booking deadline never after `startAt`.
 */
export const departureSchema = z
  .object({
    startAt: dateTimeField(true),
    endAt: dateTimeField(true),
    capacity: z.coerce.number().int().positive(),
    bookingDeadline: dateTimeField(false),
    notes: z.string().trim().max(10000),
  })
  .strict()
  .superRefine((values, ctx) => {
    if (values.startAt && values.endAt && Date.parse(values.endAt) <= Date.parse(values.startAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'endAfterStart' });
    }
    if (
      values.startAt &&
      values.bookingDeadline &&
      Date.parse(values.bookingDeadline) > Date.parse(values.startAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bookingDeadline'],
        message: 'deadlineAfterStart',
      });
    }
  });

export type DepartureFormValues = z.infer<typeof departureSchema>;
