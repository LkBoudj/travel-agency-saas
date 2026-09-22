import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLoginFieldErrors, loginSchema } from './login.schema.ts';

const t = (key: string) => `[${key}]`;

function fieldErrors(values: Parameters<(typeof loginSchema)['parse']>[0]) {
  const result = loginSchema.safeParse(values);
  assert.ok(!result.success, 'expected invalid values');
  return getLoginFieldErrors(result.error, t);
}

test('accepts valid credentials', () => {
  const result = loginSchema.safeParse({ email: 'ada@example.com', password: 'secret' });
  assert.equal(result.success, true);
});

test('trims and accepts padded email', () => {
  const result = loginSchema.safeParse({ email: '  ada@example.com  ', password: 'secret' });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, 'ada@example.com');
  }
});

test('empty email maps to emailRequired', () => {
  assert.deepEqual(fieldErrors({ email: '', password: 'secret' }), {
    email: '[validation.emailRequired]',
  });
});

test('malformed email maps to emailInvalid', () => {
  assert.deepEqual(fieldErrors({ email: 'not-an-email', password: 'secret' }), {
    email: '[validation.emailInvalid]',
  });
});

test('empty password maps to passwordRequired', () => {
  assert.deepEqual(fieldErrors({ email: 'ada@example.com', password: '' }), {
    password: '[validation.passwordRequired]',
  });
});

test('keeps the first issue per field', () => {
  const errors = fieldErrors({ email: '', password: '' });
  assert.deepEqual(errors, {
    email: '[validation.emailRequired]',
    password: '[validation.passwordRequired]',
  });
});
