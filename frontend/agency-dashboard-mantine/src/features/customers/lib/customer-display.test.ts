import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Customer } from '../types.ts';
import { customerDisplayName, customerInitials } from './customer-display.ts';

const baseCustomer: Customer = {
  code: 'CUS-ABC123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  notes: null,
  status: 'ACTIVE',
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

describe('customerDisplayName', () => {
  test('joins the known name parts', () => {
    assert.equal(customerDisplayName(baseCustomer), 'Ada Lovelace');
  });

  test('falls back to the email when no name is known', () => {
    const customer = { ...baseCustomer, firstName: null, lastName: null };
    assert.equal(customerDisplayName(customer), 'ada@example.com');
  });

  test('falls back to the code when neither name nor email is known', () => {
    const customer: Customer = { ...baseCustomer, firstName: null, lastName: null, email: null };
    assert.equal(customerDisplayName(customer), 'CUS-ABC123');
  });

  test('skips blank name parts', () => {
    const customer = { ...baseCustomer, lastName: '' };
    assert.equal(customerDisplayName(customer), 'Ada');
  });
});

describe('customerInitials', () => {
  test('uses first and last initials from the full name', () => {
    assert.equal(customerInitials(baseCustomer), 'AL');
  });

  test('uses the single-part initial when only one name is present', () => {
    const customer = { ...baseCustomer, lastName: null };
    assert.equal(customerInitials(customer), 'A');
  });

  test('falls back to the email initial when no name is known', () => {
    const customer = { ...baseCustomer, firstName: null, lastName: null };
    assert.equal(customerInitials(customer), 'A');
  });

  test('falls back to the code initial with no name or email', () => {
    const customer: Customer = { ...baseCustomer, firstName: null, lastName: null, email: null };
    assert.equal(customerInitials(customer), 'C');
  });
});
