import type { TFunction } from "i18next"
import { z } from "zod"

/**
 * Departure add/edit form schema.
 *
 * Mirrors the backend contract: `endAt` must sit strictly after `startAt` and
 * a booking deadline, when typed, must not land after `startAt`. The deadline
 * is optional — an empty field carries no deadline. Validation lives here,
 * never in `onSubmit`.
 *
 * The status is always part of the validated values (it just does not render
 * in create mode): create still lands OPEN because the payload builder omits
 * the status, so the backend fixes it. The full upper-domain (including
 * `CANCELLED`) is accepted so a stored value always inflates — the cancel
 * action is where CANCELLED happens.
 *
 * Messages are localized per active language.
 */
export function createDepartureFormSchema(options: { t: TFunction }) {
  const { t } = options

  const shape = {
    startAt: z.string().min(1, t("trips:validation.startAtRequired")),
    endAt: z.string().min(1, t("trips:validation.endAtRequired")),
    capacity: z.coerce
      .number()
      .int()
      .positive(t("trips:validation.capacityPositive")),
    bookingDeadline: z.string(),
    notes: z.string(),
    status: z.enum(["OPEN", "CLOSED", "CANCELLED"] as const),
  }

  return z
    .object(shape)
    .superRefine((departure, ctx) => {
      const addIssue = (path: (string | number)[], message: string) => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message })
      }

      if (
        departure.endAt &&
        departure.startAt &&
        departure.endAt <= departure.startAt
      ) {
        addIssue(["endAt"], t("trips:validation.endAfterStart"))
      }

      // Calendar-day comparison: a deadline on the very day of departure is
      // allowed; anything later is not. Date-only strings stay stable across
      // timezones this way.
      const deadlineDay = departure.bookingDeadline?.slice(0, 10)
      const startDay = departure.startAt?.slice(0, 10)
      if (deadlineDay && startDay && deadlineDay > startDay) {
        addIssue(
          ["bookingDeadline"],
          t("trips:departures.form.deadlineAfterStart")
        )
      }
    })
}

export type DepartureFormValues = z.infer<
  ReturnType<typeof createDepartureFormSchema>
>