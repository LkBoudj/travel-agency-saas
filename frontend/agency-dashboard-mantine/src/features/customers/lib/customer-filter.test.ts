import { describe, expect, test } from 'vitest';
import type { Customer } from '../types.ts';
import { filterCustomersByStatus } from './customer-filter.ts';

function customer(code: string, status: Customer['status']): Customer {
  return {
    code,
    status,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    notes: null,
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
  };
}

const ROWS = [
  customer('CUS-1', 'ACTIVE'),
  customer('CUS-2', 'ARCHIVED'),
  customer('CUS-3', 'ACTIVE'),
];

describe('filterCustomersByStatus', () => {
  test('passes every row through when no status is chosen', () => {
    expect(filterCustomersByStatus(ROWS, 'all').map((row) => row.code)).toEqual([
      'CUS-1',
      'CUS-2',
      'CUS-3',
    ]);
  });

  test('keeps only the chosen status', () => {
    expect(filterCustomersByStatus(ROWS, 'ARCHIVED').map((row) => row.code)).toEqual(['CUS-2']);
  });

  test('never returns the original array, so a view cannot mutate the cache', () => {
    const rows: Customer[] = [customer('CUS-1', 'ACTIVE')];
    const filtered = filterCustomersByStatus(rows, 'all');

    expect(filtered).not.toBe(rows);
    expect(filtered).toEqual(rows);
  });

  test('handles an empty list', () => {
    expect(filterCustomersByStatus([], 'ACTIVE')).toEqual([]);
  });
});
