import type {
  AgencyDeparture,
  DeparturePayload,
  DepartureStatus,
  DepartureUpdatePayload,
} from "../types/departure.types"

/**
 * Mapping between the departure form and the Departures API.
 *
 * Pure functions, no React, no `@/` imports — loaded directly by `node --test`.
 *
 * The form edits native input values: `datetime-local` strings for the window
 * and a date-only `YYYY-MM-DD` for the optional booking deadline. The backend
 * only requires values that parse as date-times, so the deadline is promoted
 * to midnight UTC and an empty field means "no deadline" (`null`) — never a
 * stored stub.
 */

/** A blank form field means "no value", never a stored `""` stub. */
function notesToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim()
  return trimmed.length === 0 ? null : trimmed
}

/** A date-only input value becomes midnight UTC; blank means no deadline. */
function deadlineToDateTime(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : `${trimmed}T00:00:00.000Z`
}

/** Create payload: status is never sent — the backend fixes it to OPEN. */
export function buildDeparturePayload(input: {
  startAt: string
  endAt: string
  capacity: number
  bookingDeadline: string
  notes: string
}): DeparturePayload {
  return {
    startAt: input.startAt,
    endAt: input.endAt,
    capacity: input.capacity,
    bookingDeadline: deadlineToDateTime(input.bookingDeadline),
    notes: notesToNull(input.notes),
  }
}

/** Update payload: the same operational fields plus the status select. */
export function buildDepartureUpdatePayload(
  input: Parameters<typeof buildDeparturePayload>[0] & { status: DepartureStatus }
): DepartureUpdatePayload {
  return { ...buildDeparturePayload(input), status: input.status }
}

/** `datetime-local` fields: the stored ISO value truncated to the minutes. */
function toDateTimeLocal(value: string): string {
  return value.slice(0, 16)
}

/** The date-only deadline input: the stored ISO value truncated to the date. */
function toDateValue(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

/** Starts the add form from a blank departure cadence. */
export function emptyDepartureForm(defaultStatus: DepartureStatus): {
  startAt: string
  endAt: string
  capacity: number
  bookingDeadline: string
  notes: string
  status: DepartureStatus
} {
  return {
    startAt: "",
    endAt: "",
    capacity: 1,
    bookingDeadline: "",
    notes: "",
    status: defaultStatus,
  }
}

/** Starts the edit form from a stored departure. */
export function toDepartureFormValues(departure: AgencyDeparture): {
  startAt: string
  endAt: string
  capacity: number
  bookingDeadline: string
  notes: string
  status: DepartureStatus
} {
  return {
    startAt: toDateTimeLocal(departure.startAt),
    endAt: toDateTimeLocal(departure.endAt),
    capacity: departure.capacity,
    bookingDeadline: toDateValue(departure.bookingDeadline),
    notes: departure.notes ?? "",
    status: departure.status,
  }
}