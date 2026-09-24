import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BookingStatus } from '../types.ts';
import {
  bookingCustomerName,
  canCancelBooking,
  formatBookingAmount,
  formatBookingDate,
  isTerminalBooking,
} from './booking-display.ts';

describe('terminal status', () => {
  it('cancelled is terminal, pending and confirmed are not', () => {
    assert.equal(isTerminalBooking('CANCELLED'), true);
    assert.equal(isTerminalBooking('PENDING'), false);
    assert.equal(isTerminalBooking('CONFIRMED'), false);
  });

  it('canCancelBooking follows the same rule', () => {
    assert.equal(canCancelBooking({ status: 'PENDING' }), true);
    assert.equal(canCancelBooking({ status: 'CANCELLED' as BookingStatus }), false);
  });
});

describe('bookingCustomerName', () => {
  it('joins recorded name parts', () => {
    assert.equal(
      bookingCustomerName({
        code: 'CUS-1',
        firstName: '  Amine ',
        lastName: ' Benaissa',
      }),
      'Amine Benaissa'
    );
  });

  it('falls back to the code when no name is recorded', () => {
    assert.equal(bookingCustomerName({ code: 'CUS-7', firstName: null, lastName: null }), 'CUS-7');
  });
});

describe('formatBookingDate', () => {
  it('formats a valid ISO date', () => {
    assert.equal(formatBookingDate('2026-05-01T10:00:00.000Z'), '01 May 2026');
  });

  it('degrades invalid input to a dash', () => {
    assert.equal(formatBookingDate('not-a-date'), '—');
  });
});

describe('formatBookingAmount', () => {
  it('formats a number in its own currency with two decimals', () => {
    assert.match(formatBookingAmount(96000, 'DZD'), /96,000/);
    assert.match(formatBookingAmount(96000, 'DZD'), /DZD/);
  });

  it('degrades nullish input to a dash', () => {
    assert.equal(formatBookingAmount(null, 'DZD'), '—');
    assert.equal(formatBookingAmount(undefined, 'DZD'), '—');
  });
});
