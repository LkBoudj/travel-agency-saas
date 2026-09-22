import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { getLoginErrorMessage } from './auth-error-messages.ts';

const t = (key: string) => `[${key}]`;

test('maps 401 to invalidCredentials', () => {
  assert.equal(getLoginErrorMessage(new ApiError('bad', 401), t), '[errors.invalidCredentials]');
});

test('maps 429 to rateLimited', () => {
  assert.equal(getLoginErrorMessage(new ApiError('slow down', 429), t), '[errors.rateLimited]');
});

test('maps TypeError to network', () => {
  assert.equal(getLoginErrorMessage(new TypeError('Failed to fetch'), t), '[errors.network]');
});

test('maps other failures to generic', () => {
  assert.equal(getLoginErrorMessage(new ApiError('boom', 500), t), '[errors.generic]');
  assert.equal(getLoginErrorMessage(undefined, t), '[errors.generic]');
});
