import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { customerSchema } from './customer.schema.ts';

describe('customerSchema', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 0123',
    notes: 'Prefers email.',
  };

  test('accepts a fully filled, correctly formatted customer', () => {
    assert.equal(customerSchema.safeParse(valid).success, true);
  });

  test('accepts an entirely blank customer', () => {
    const result = customerSchema.safeParse({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: '',
    });
    assert.equal(result.success, true);
  });

  test('rejects a name longer than 100 chars', () => {
    const result = customerSchema.safeParse({ ...valid, firstName: 'x'.repeat(101) });
    assert.equal(result.success, false);
  });

  test('rejects a malformed email', () => {
    const result = customerSchema.safeParse({ ...valid, email: 'not-an-email' });
    assert.equal(result.success, false);
  });

  test('rejects a phone longer than 32 chars', () => {
    const result = customerSchema.safeParse({ ...valid, phone: 'x'.repeat(33) });
    assert.equal(result.success, false);
  });

  test('rejects notes longer than 2000 chars', () => {
    const result = customerSchema.safeParse({ ...valid, notes: 'x'.repeat(2001) });
    assert.equal(result.success, false);
  });

  test('rejects unknown keys', () => {
    const result = customerSchema.safeParse({ ...valid, unexpected: true });
    assert.equal(result.success, false);
  });
});
