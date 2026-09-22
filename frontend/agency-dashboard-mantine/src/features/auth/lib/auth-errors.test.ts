import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { classifyLoginError } from './auth-errors.ts';

test('classifies 401 as invalid-credentials', () => {
  assert.equal(
    classifyLoginError(new ApiError('Wrong email or password', 401)),
    'invalid-credentials'
  );
});

test('classifies 429 as rate-limited', () => {
  assert.equal(
    classifyLoginError(new ApiError('Too many attempts', 429, 'RATE_LIMITED')),
    'rate-limited'
  );
});

test('classifies other API status codes as unknown', () => {
  assert.equal(classifyLoginError(new ApiError('Internal', 500)), 'unknown');
  assert.equal(classifyLoginError(new ApiError('Teapot', 418)), 'unknown');
});

test('classifies TypeError as network', () => {
  assert.equal(classifyLoginError(new TypeError('Failed to fetch')), 'network');
});

test('classifies non-errors as unknown', () => {
  assert.equal(classifyLoginError('oops'), 'unknown');
  assert.equal(classifyLoginError(undefined), 'unknown');
});
