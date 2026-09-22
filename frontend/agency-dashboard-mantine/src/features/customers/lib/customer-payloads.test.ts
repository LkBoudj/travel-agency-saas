import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { CustomerFormValues } from '../schemas/customer.schema.ts';
import {
  buildCustomerCreatePayload,
  buildCustomerSearchQuery,
  buildCustomerUpdatePayload,
  type CustomerFormPayload,
} from './customer-payloads.ts';

const filled: CustomerFormValues = {
  firstName: '  Ada ',
  lastName: 'Lovelace',
  email: '  ADA@Example.COM ',
  phone: ' +1 555 ',
  notes: '  Prefers email.  ',
};

describe('buildCustomerCreatePayload', () => {
  test('trims every field and lowercases the email', () => {
    const payload = buildCustomerCreatePayload(filled);
    assert.deepEqual(payload, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+1 555',
      notes: 'Prefers email.',
    });
  });

  test('turns blank fields into null', () => {
    const payload = buildCustomerCreatePayload({
      firstName: '',
      lastName: '   ',
      email: '',
      phone: '',
      notes: '',
    });
    assert.deepEqual(payload, {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      notes: null,
    });
  });
});

describe('buildCustomerUpdatePayload', () => {
  test('matches the create shape (blank clears, filled sets)', () => {
    const create = buildCustomerCreatePayload({ ...filled, notes: '  ' });
    const update = buildCustomerUpdatePayload({ ...filled, notes: '  ' }) as CustomerFormPayload;
    assert.deepEqual(update, create);
  });
});

describe('buildCustomerSearchQuery', () => {
  test('omits the query for blank searches', () => {
    assert.equal(buildCustomerSearchQuery(''), '');
    assert.equal(buildCustomerSearchQuery('   '), '');
  });

  test('encodes the trimmed search', () => {
    assert.equal(buildCustomerSearchQuery(' ada '), '?search=ada');
    assert.equal(buildCustomerSearchQuery('a b'), '?search=a%20b');
  });
});
