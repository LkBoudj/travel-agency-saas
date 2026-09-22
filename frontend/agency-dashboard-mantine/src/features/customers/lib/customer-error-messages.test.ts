import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { getCustomerErrorMessage } from './customer-error-messages.ts';

const t = (key: string) => (key === 'errors.network' ? 'NETWORK' : `KEY:${key}`);

describe('getCustomerErrorMessage', () => {
  test('translates an ARCHIVED failure through the mapping', () => {
    assert.equal(
      getCustomerErrorMessage(new ApiError('Archived', 409, 'CUSTOMER_ALREADY_ARCHIVED'), t),
      'KEY:errors.alreadyArchived'
    );
  });

  test('surfaces the network message for TypeError', () => {
    assert.equal(getCustomerErrorMessage(new TypeError('failed'), t), 'NETWORK');
  });
});
