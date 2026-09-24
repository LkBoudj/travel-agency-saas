import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { activeOptionCount } from './pricing-display.ts';
import { getPricingErrorMessage } from './pricing-error-messages.ts';
import { classifyPricingActionError } from './pricing-errors.ts';

const apiError = (code: string) => new ApiError('', 409, code);

describe('classifyPricingActionError', () => {
  it('classifies known backend codes', () => {
    assert.equal(classifyPricingActionError(apiError('TOUR_NOT_FOUND')), 'tour-not-found');
    assert.equal(
      classifyPricingActionError(apiError('PRICING_OPTION_NOT_FOUND')),
      'option-not-found'
    );
    assert.equal(
      classifyPricingActionError(apiError('DEPARTURE_NOT_FOUND')),
      'departure-not-found'
    );
    assert.equal(classifyPricingActionError(apiError('PRICING_OPTION_NAME_TAKEN')), 'name-taken');
    assert.equal(
      classifyPricingActionError(apiError('PRICING_CURRENCY_MISMATCH')),
      'currency-mismatch'
    );
    assert.equal(
      classifyPricingActionError(apiError('PRICING_OPTION_INACTIVE')),
      'option-inactive'
    );
    assert.equal(
      classifyPricingActionError(apiError('PRICING_OPTION_ALREADY_INACTIVE')),
      'already-inactive'
    );
    assert.equal(
      classifyPricingActionError(apiError('DEPARTURE_ALREADY_CANCELLED')),
      'departure-cancelled'
    );
  });

  it('falls back to unknown for unclassified codes', () => {
    assert.equal(classifyPricingActionError(apiError('INTERNAL_SERVER_ERROR')), 'unknown');
  });

  it('maps TypeErrors to network failures', () => {
    assert.equal(classifyPricingActionError(new TypeError('fetch failed')), 'network');
  });

  it('treats any other error as unknown', () => {
    assert.equal(classifyPricingActionError(new Error('boom')), 'unknown');
  });
});

describe('getPricingErrorMessage', () => {
  const t = (key: string) => `!${key}!`;

  it('resolves the message key for each failure kind', () => {
    assert.equal(
      getPricingErrorMessage(apiError('PRICING_OPTION_NAME_TAKEN'), t),
      '!errors.nameTaken!'
    );
    assert.equal(
      getPricingErrorMessage(apiError('PRICING_CURRENCY_MISMATCH'), t),
      '!errors.currencyMismatch!'
    );
    assert.equal(
      getPricingErrorMessage(apiError('PRICING_OPTION_ALREADY_INACTIVE'), t),
      '!errors.alreadyInactive!'
    );
  });

  it('maps TypeError to the network message', () => {
    assert.equal(getPricingErrorMessage(new TypeError('fetch failed'), t), '!errors.network!');
  });
});

describe('activeOptionCount', () => {
  it('counts only ACTIVE options', () => {
    assert.equal(
      activeOptionCount([{ status: 'ACTIVE' }, { status: 'INACTIVE' }, { status: 'ACTIVE' }]),
      2
    );
  });

  it('is zero for an empty list', () => {
    assert.equal(activeOptionCount([]), 0);
  });
});
