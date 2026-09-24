import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { getDepartureErrorMessage } from './departure-error-messages.ts';
import { classifyDepartureActionError } from './departure-errors.ts';

const apiError = (code: string) => new ApiError('', 409, code);

describe('classifyDepartureActionError', () => {
  it('classifies known backend codes', () => {
    assert.equal(classifyDepartureActionError(apiError('TOUR_NOT_FOUND')), 'tour-not-found');
    assert.equal(
      classifyDepartureActionError(apiError('DEPARTURE_NOT_FOUND')),
      'departure-not-found'
    );
    assert.equal(
      classifyDepartureActionError(apiError('DEPARTURE_ALREADY_CANCELLED')),
      'already-cancelled'
    );
    assert.equal(
      classifyDepartureActionError(apiError('DEPARTURE_CAPACITY_BELOW_RESERVED')),
      'capacity-below-reserved'
    );
    assert.equal(
      classifyDepartureActionError(apiError('DEPARTURE_HAS_ACTIVE_BOOKINGS')),
      'has-active-bookings'
    );
  });

  it('falls back to unknown for unclassified codes', () => {
    assert.equal(classifyDepartureActionError(apiError('INTERNAL_SERVER_ERROR')), 'unknown');
  });

  it('maps TypeErrors to network failures', () => {
    assert.equal(classifyDepartureActionError(new TypeError('fetch failed')), 'network');
  });

  it('treats any other error as unknown', () => {
    assert.equal(classifyDepartureActionError(new Error('boom')), 'unknown');
  });
});

describe('getDepartureErrorMessage', () => {
  const t = (key: string) => `!${key}!`;

  it('resolves the message key for each failure kind', () => {
    assert.equal(
      getDepartureErrorMessage(apiError('DEPARTURE_CAPACITY_BELOW_RESERVED'), t),
      '!errors.capacityBelowReserved!'
    );
    assert.equal(
      getDepartureErrorMessage(apiError('DEPARTURE_HAS_ACTIVE_BOOKINGS'), t),
      '!errors.hasActiveBookings!'
    );
    assert.equal(
      getDepartureErrorMessage(apiError('DEPARTURE_ALREADY_CANCELLED'), t),
      '!errors.alreadyCancelled!'
    );
  });

  it('maps TypeError to the network message', () => {
    assert.equal(getDepartureErrorMessage(new TypeError('fetch failed'), t), '!errors.network!');
  });
});
