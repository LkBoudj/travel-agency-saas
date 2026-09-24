import dayjs from 'dayjs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Departure } from '../types.ts';
import {
  buildDeparturePayload,
  buildDepartureUpdatePayload,
  emptyDepartureForm,
  openDepartureCount,
  toDepartureFormValues,
  toIsoDateTime,
} from './departure-payloads.ts';

/** Mirrors the `valueFormat` the departure form passes to `DateTimePicker` — the
 *  payload builder normalizes exactly what the picker emits. */
function pickerDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm:ss');
}

describe('buildDeparturePayload', () => {
  it('normalizes picker dates to ISO strings', () => {
    const payload = buildDeparturePayload({
      startAt: pickerDateTime('2026-10-01T08:00:00.000Z'),
      endAt: pickerDateTime('2026-10-07T18:00:00.000Z'),
      capacity: 12,
      bookingDeadline: pickerDateTime('2026-09-20T00:00:00.000Z'),
      notes: '  Meet at the port.  ',
    });

    assert.equal(payload.startAt, new Date('2026-10-01T08:00:00.000Z').toISOString());
    assert.equal(payload.endAt, new Date('2026-10-07T18:00:00.000Z').toISOString());
    assert.equal(payload.capacity, 12);
    assert.equal(payload.bookingDeadline, new Date('2026-09-20T00:00:00.000Z').toISOString());
    assert.equal(payload.notes, 'Meet at the port.');
  });

  it('converts blank optional values to null', () => {
    const payload = buildDeparturePayload({
      startAt: pickerDateTime('2026-10-01T08:00:00.000Z'),
      endAt: pickerDateTime('2026-10-07T18:00:00.000Z'),
      capacity: 12,
      bookingDeadline: '   ',
      notes: '',
    });

    assert.equal(payload.bookingDeadline, null);
    assert.equal(payload.notes, null);
  });

  it('keeps a zero capacity untouched', () => {
    const payload = buildDeparturePayload({
      startAt: pickerDateTime('2026-10-01T08:00:00.000Z'),
      endAt: pickerDateTime('2026-10-07T18:00:00.000Z'),
      capacity: 0,
      bookingDeadline: '',
      notes: '',
    });

    assert.equal(payload.capacity, 0);
  });
});

describe('buildDepartureUpdatePayload', () => {
  it('adds the status to the operational fields', () => {
    const payload = buildDepartureUpdatePayload(
      {
        startAt: pickerDateTime('2026-10-01T08:00:00.000Z'),
        endAt: pickerDateTime('2026-10-07T18:00:00.000Z'),
        capacity: 8,
        bookingDeadline: '',
        notes: '',
      },
      'CLOSED'
    );

    assert.equal(payload.status, 'CLOSED');
    assert.equal(payload.capacity, 8);
  });
});

describe('toIsoDateTime', () => {
  it('returns a valid ISO string for parseable input', () => {
    assert.equal(
      toIsoDateTime('2026-10-01 08:00:00'),
      new Date('2026-10-01 08:00:00').toISOString()
    );
  });

  it('returns the input unchanged when it is not parseable', () => {
    assert.equal(toIsoDateTime('not-a-date'), 'not-a-date');
  });
});

describe('emptyDepartureForm', () => {
  it('returns a blank cadence defaulting to capacity 1', () => {
    assert.deepEqual(emptyDepartureForm(), {
      startAt: '',
      endAt: '',
      capacity: 1,
      bookingDeadline: '',
      notes: '',
    });
  });
});

describe('toDepartureFormValues', () => {
  const departure: Departure = {
    code: 'DEP-ABC123',
    status: 'CLOSED',
    startAt: '2026-12-20T08:00:00.000Z',
    endAt: '2026-12-20T18:30:00.000Z',
    capacity: 9,
    bookingDeadline: '2026-12-10T12:00:00.000Z',
    notes: 'Moved to winter.',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  it('formats stored ISO dates into picker strings', () => {
    assert.deepEqual(toDepartureFormValues(departure), {
      startAt: pickerDateTime('2026-12-20T08:00:00.000Z'),
      endAt: pickerDateTime('2026-12-20T18:30:00.000Z'),
      capacity: 9,
      bookingDeadline: pickerDateTime('2026-12-10T12:00:00.000Z'),
      notes: 'Moved to winter.',
    });
  });

  it('turns a missing deadline and notes into empty form fields', () => {
    assert.deepEqual(toDepartureFormValues({ ...departure, bookingDeadline: null, notes: null }), {
      startAt: pickerDateTime('2026-12-20T08:00:00.000Z'),
      endAt: pickerDateTime('2026-12-20T18:30:00.000Z'),
      capacity: 9,
      bookingDeadline: '',
      notes: '',
    });
  });
});

describe('openDepartureCount', () => {
  it('counts only OPEN departures', () => {
    assert.equal(
      openDepartureCount([
        { status: 'OPEN' },
        { status: 'CLOSED' },
        { status: 'CANCELLED' },
        { status: 'OPEN' },
      ]),
      2
    );
  });

  it('is zero for an empty list', () => {
    assert.equal(openDepartureCount([]), 0);
  });
});
