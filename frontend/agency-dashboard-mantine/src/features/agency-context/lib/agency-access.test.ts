import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { classifyAgencyAccessError } from './agency-access.ts';

describe('classifyAgencyAccessError', () => {
  test('maps guard codes to failure kinds', () => {
    assert.equal(
      classifyAgencyAccessError(new ApiError('x', 403, 'AGENCY_SUSPENDED')),
      'suspended'
    );
    assert.equal(
      classifyAgencyAccessError(new ApiError('x', 403, 'AGENCY_MEMBERSHIP_REQUIRED')),
      'not-member'
    );
    assert.equal(
      classifyAgencyAccessError(new ApiError('x', 403, 'AGENCY_MEMBERSHIP_INACTIVE')),
      'inactive'
    );
    assert.equal(
      classifyAgencyAccessError(new ApiError('x', 403, 'AGENCY_PERMISSION_DENIED')),
      'permission-denied'
    );
    assert.equal(
      classifyAgencyAccessError(new ApiError('x', 404, 'AGENCY_NOT_FOUND')),
      'not-found'
    );
  });
  test('falls back for anything else', () => {
    assert.equal(classifyAgencyAccessError(new ApiError('x', 500)), 'unexpected');
    assert.equal(classifyAgencyAccessError(new TypeError('network')), 'unexpected');
    assert.equal(classifyAgencyAccessError(null), 'unexpected');
  });
});
