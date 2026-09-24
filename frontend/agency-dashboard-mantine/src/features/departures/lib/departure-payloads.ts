import dayjs from 'dayjs';
import type { DepartureFormValues } from '../schemas/departure.schema.ts';
import type { Departure, DepartureStatus } from '../types.ts';

export interface DeparturePayload {
  startAt: string;
  endAt: string;
  capacity: number;
  bookingDeadline: string | null;
  notes: string | null;
}

export interface DepartureUpdatePayload extends DeparturePayload {
  status: DepartureStatus;
}

/** Starts the add form from a blank departure cadence. */
export function emptyDepartureForm(): DepartureFormValues {
  return { startAt: '', endAt: '', capacity: 1, bookingDeadline: '', notes: '' };
}

/** Starts the edit form from a stored departure (picker-format dates). */
export function toDepartureFormValues(departure: Departure): DepartureFormValues {
  return {
    startAt: toPickerDateTime(departure.startAt),
    endAt: toPickerDateTime(departure.endAt),
    capacity: departure.capacity,
    bookingDeadline: departure.bookingDeadline ? toPickerDateTime(departure.bookingDeadline) : '',
    notes: departure.notes ?? '',
  };
}

/** The open departures of a tour — the count the publish gate needs. */
export function openDepartureCount(departures: ReadonlyArray<{ status: DepartureStatus }>): number {
  return departures.filter((departure) => departure.status === 'OPEN').length;
}

/** The exact body the POST /tours/:tourCode/departures endpoint accepts. */
export function buildDeparturePayload(values: DepartureFormValues): DeparturePayload {
  return {
    startAt: toIsoDateTime(values.startAt),
    endAt: toIsoDateTime(values.endAt),
    capacity: values.capacity,
    bookingDeadline:
      values.bookingDeadline.trim().length > 0 ? toIsoDateTime(values.bookingDeadline) : null,
    notes: toNullableText(values.notes),
  };
}

/**
 * The exact body the PUT /tours/:tourCode/departures/:code endpoint accepts.
 * Update additionally carries the departure status (OPEN↔CLOSED only).
 */
export function buildDepartureUpdatePayload(
  values: DepartureFormValues,
  status: DepartureStatus
): DepartureUpdatePayload {
  return { ...buildDeparturePayload(values), status };
}

/** Normalizes a picker date-time string to an ISO-8601 string. */
export function toIsoDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** The `valueFormat` the departure form passes to `DateTimePicker`. */
function toPickerDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm:ss');
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
