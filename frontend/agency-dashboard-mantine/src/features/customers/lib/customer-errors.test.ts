import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { classifyCustomerActionError } from './customer-errors.ts';

describe('classifyCustomerActionError', () => {
  test('maps CUSTOMER_NOT_FOUND to not-found', () => {
    assert.equal(
      classifyCustomerActionError(new ApiError('Not found', 404, 'CUSTOMER_NOT_FOUND')),
      'not-found'
    );
  });

  test('maps CUSTOMER_ALREADY_ARCHIVED to already-archived', () => {
    assert.equal(
      classifyCustomerActionError(new ApiError('Archived', 409, 'CUSTOMER_ALREADY_ARCHIVED')),
      'already-archived'
    );
  });

  test('maps network failures to network', () => {
    assert.equal(classifyCustomerActionError(new TypeError('fetch failed')), 'network');
  });

  test('falls back to unknown for unexpected backend codes', () => {
    assert.equal(
      classifyCustomerActionError(new ApiError('Nope', 500, 'SOMETHING_ELSE')),
      'unknown'
    );
  });

  test('falls back to unknown for plain errors', () => {
    assert.equal(classifyCustomerActionError(new Error('boom')), 'unknown');
  });
});
