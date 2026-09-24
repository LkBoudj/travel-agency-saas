import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { getBookingErrorMessage } from './booking-error-messages.ts';
import { classifyBookingActionError, type BookingActionFailureKind } from './booking-errors.ts';

const apiError = (code: string) => new ApiError('', 409, code);

describe('classifyBookingActionError', () => {
  it('classifies the known backend codes', () => {
    const expected: Array<[string, BookingActionFailureKind]> = [
      ['BOOKING_NOT_FOUND', 'booking-not-found'],
      ['BOOKING_TOUR_ARCHIVED', 'tour-archived'],
      ['BOOKING_DEPARTURE_NOT_OPEN', 'departure-not-open'],
      ['BOOKING_DEADLINE_PASSED', 'deadline-passed'],
      ['BOOKING_DEPARTURE_STARTED', 'departure-started'],
      ['BOOKING_CAPACITY_EXCEEDED', 'capacity-exceeded'],
      ['BOOKING_PRICE_OPTION_NOT_FOUND', 'price-option-not-found'],
      ['BOOKING_PRICE_OPTION_INACTIVE', 'price-option-inactive'],
      ['BOOKING_CURRENCY_MISMATCH', 'currency-mismatch'],
      ['BOOKING_TOTAL_EXCEEDS_LIMIT', 'total-exceeds-limit'],
      ['BOOKING_ALREADY_CONFIRMED', 'already-confirmed'],
      ['BOOKING_INVALID_TRANSITION', 'invalid-transition'],
      ['BOOKING_ALREADY_CANCELLED', 'already-cancelled'],
      ['BOOKING_TRAVELERS_FROZEN', 'travelers-frozen'],
      ['BOOKING_TRAVELER_LIMIT_REACHED', 'traveler-limit-reached'],
      ['BOOKING_TRAVELER_COUNT_MISMATCH', 'traveler-count-mismatch'],
      ['TRAVELER_NOT_FOUND', 'traveler-not-found'],
      ['CUSTOMER_NOT_FOUND', 'customer-not-found'],
      ['CUSTOMER_ARCHIVED', 'customer-archived'],
      ['DEPARTURE_NOT_FOUND', 'departure-not-found'],
      ['TOUR_NOT_FOUND', 'tours-not-found'],
      ['AGENCY_NOT_FOUND', 'agency-not-found'],
      ['AGENCY_SUSPENDED', 'agency-suspended'],
      ['AGENCY_MEMBERSHIP_INACTIVE', 'membership-inactive'],
      ['AGENCY_PERMISSION_DENIED', 'permission-denied'],
    ];
    for (const [code, kind] of expected) {
      assert.equal(classifyBookingActionError(apiError(code)), kind, code);
    }
  });

  it('maps a 401/403 ApiError to permission-denied', () => {
    assert.equal(classifyBookingActionError(new ApiError('', 401)), 'permission-denied');
    assert.equal(classifyBookingActionError(new ApiError('', 403)), 'permission-denied');
  });

  it('falls back to unknown for unclassified codes', () => {
    assert.equal(classifyBookingActionError(apiError('INTERNAL_SERVER_ERROR')), 'unknown');
  });

  it('maps TypeErrors to network failures', () => {
    assert.equal(classifyBookingActionError(new TypeError('fetch failed')), 'network');
  });

  it('treats any other error as unknown', () => {
    assert.equal(classifyBookingActionError(new Error('boom')), 'unknown');
  });
});

describe('getBookingErrorMessage', () => {
  const t = (key: string) => `!${key}!`;

  it('resolves the message key for each failure kind', () => {
    assert.equal(
      getBookingErrorMessage(apiError('BOOKING_CAPACITY_EXCEEDED'), t),
      '!errors.capacityExceeded!'
    );
    assert.equal(
      getBookingErrorMessage(apiError('BOOKING_INVALID_TRANSITION'), t),
      '!errors.invalidTransition!'
    );
    assert.equal(
      getBookingErrorMessage(apiError('BOOKING_TRAVELERS_FROZEN'), t),
      '!errors.travelersFrozen!'
    );
  });

  it('maps a 401 ApiError to the permission message', () => {
    assert.equal(getBookingErrorMessage(new ApiError('', 401), t), '!errors.permissionDenied!');
  });

  it('maps TypeError to the network message', () => {
    assert.equal(getBookingErrorMessage(new TypeError('fetch failed'), t), '!errors.network!');
  });
});
