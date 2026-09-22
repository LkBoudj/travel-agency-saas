import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formatMoney } from './format-money.ts';

describe('formatMoney', () => {
  test('formats USD for the given Intl locale', () => {
    assert.equal(formatMoney(1234.5, 'en-US'), '$1,234.50');
  });

  test('honours a fixed precision', () => {
    assert.equal(formatMoney(12.345, 'en-US', { precision: 3 }), '$12.345');
  });

  test('defaults to two decimals with a custom currency', () => {
    assert.equal(formatMoney(9.999, 'en-US', { currency: 'EUR' }), '€10.00');
  });

  test('falls back to a plain number for an unknown currency', () => {
    assert.equal(formatMoney(99.5, 'en-US', { currency: 'NOPE' }), '99.5');
  });
});
