import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseErrorBody } from './api.ts';

test('parseErrorBody: reads message and errorCode from a backend error body', () => {
  const { message, code } = parseErrorBody({
    statusCode: 404,
    message: 'Not found',
    errorCode: 'AGENCY_CUSTOMER_ALREADY_ARCHIVED',
  });

  assert.equal(message, 'Not found');
  assert.equal(code, 'AGENCY_CUSTOMER_ALREADY_ARCHIVED');
});

test('parseErrorBody: handles a legacy {message} body', () => {
  const { message, code } = parseErrorBody({ message: 'Bad credentials' });

  assert.equal(message, 'Bad credentials');
  assert.equal(code, undefined);
});

test('parseErrorBody: falls back to a generic message for non-JSON bodies', () => {
  assert.deepEqual(parseErrorBody(undefined), { message: 'Request failed' });
  assert.deepEqual(parseErrorBody('oops'), { message: 'Request failed' });
});

test('parseErrorBody: falls back when message is blank or not a string', () => {
  assert.deepEqual(parseErrorBody({ message: '   ' }), { message: 'Request failed' });
  assert.deepEqual(parseErrorBody({ message: 42 }), { message: 'Request failed' });
});
