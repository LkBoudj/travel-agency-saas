import dayjs from 'dayjs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { departureSchema } from './departure.schema.ts';

/** Mirrors the `valueFormat` the departure form passes to `DateTimePicker`. */
function pickerDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm:ss');
}

const valid = {
  startAt: pickerDateTime('2026-12-20T08:00:00.000Z'),
  endAt: pickerDateTime('2026-12-20T18:00:00.000Z'),
  capacity: 12,
  bookingDeadline: '',
  notes: '',
};

describe('departureSchema', () => {
  it('accepts a valid departure', () => {
    assert.equal(departureSchema.safeParse(valid).success, true);
  });

  it('rejects a missing startAt', () => {
    const result = departureSchema.safeParse({ ...valid, startAt: '   ' });
    assert.equal(result.success, false);
    if (!result.success) {
      const field = result.error.issues.find((issue) => issue.path[0] === 'startAt');
      assert.ok(field, 'expected an issue on startAt');
      assert.equal(field.code, 'too_small');
    }
  });

  it('rejects a missing endAt', () => {
    const result = departureSchema.safeParse({ ...valid, endAt: '' });
    assert.equal(result.success, false);
    if (!result.success) {
      const field = result.error.issues.find((issue) => issue.path[0] === 'endAt');
      assert.ok(field, 'expected an issue on endAt');
      assert.equal(field.code, 'too_small');
    }
  });

  it('rejects an endAt not strictly after startAt', () => {
    const result = departureSchema.safeParse({ ...valid, endAt: valid.startAt });
    assert.equal(result.success, false);
    if (!result.success) {
      const field = result.error.issues.find((issue) => issue.path[0] === 'endAt');
      assert.ok(field, 'expected an issue on endAt');
      assert.equal(field.message, 'endAfterStart');
    }
  });

  it('accepts a blank booking deadline', () => {
    assert.equal(departureSchema.safeParse(valid).success, true);
  });

  it('rejects a booking deadline after startAt', () => {
    const result = departureSchema.safeParse({
      ...valid,
      bookingDeadline: pickerDateTime('2026-12-21T00:00:00.000Z'),
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const field = result.error.issues.find((issue) => issue.path[0] === 'bookingDeadline');
      assert.ok(field, 'expected an issue on bookingDeadline');
      assert.equal(field.message, 'deadlineAfterStart');
    }
  });

  it('accepts a booking deadline on the departure day', () => {
    const result = departureSchema.safeParse({
      ...valid,
      bookingDeadline: pickerDateTime('2026-12-20T07:00:00.000Z'),
    });
    assert.equal(result.success, true);
  });

  it('rejects a non-integer or zero capacity', () => {
    assert.equal(departureSchema.safeParse({ ...valid, capacity: 0 }).success, false);
    assert.equal(departureSchema.safeParse({ ...valid, capacity: 12.5 }).success, false);
  });
});
