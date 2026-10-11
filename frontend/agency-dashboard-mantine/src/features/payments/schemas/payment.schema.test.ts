import { describe, expect, it } from 'vitest';
import {
  buildRecordPaymentPayload,
  formatPaymentAmount,
  formatPaymentDate,
} from '../lib/payment-payloads.ts';
import { recordPaymentFormSchema } from './payment.schema.ts';

describe('recordPaymentFormSchema', () => {
  it('accepts valid payment form values', () => {
    const valid = {
      amount: 1500.5,
      method: 'CASH' as const,
      reference: 'REC-1234',
      paidAt: '2026-10-07T12:00:00Z',
      note: 'Deposit received',
    };
    const result = recordPaymentFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts string amount that converts to valid decimal', () => {
    const valid = {
      amount: '500.25',
      method: 'CARD' as const,
    };
    const result = recordPaymentFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects zero or negative amounts', () => {
    expect(recordPaymentFormSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(recordPaymentFormSchema.safeParse({ amount: -10 }).success).toBe(false);
    expect(recordPaymentFormSchema.safeParse({ amount: '-5' }).success).toBe(false);
  });

  it('rejects amounts with more than 2 decimal places', () => {
    expect(recordPaymentFormSchema.safeParse({ amount: 10.125 }).success).toBe(false);
    expect(recordPaymentFormSchema.safeParse({ amount: '10.999' }).success).toBe(false);
  });

  it('rejects invalid payment methods', () => {
    const invalid = {
      amount: 100,
      method: 'BITCOIN',
    };
    expect(recordPaymentFormSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects oversized reference or note', () => {
    expect(
      recordPaymentFormSchema.safeParse({
        amount: 100,
        reference: 'a'.repeat(121),
      }).success
    ).toBe(false);

    expect(
      recordPaymentFormSchema.safeParse({
        amount: 100,
        note: 'a'.repeat(2001),
      }).success
    ).toBe(false);
  });
});

describe('buildRecordPaymentPayload', () => {
  it('converts form values to clean API payload', () => {
    const payload = buildRecordPaymentPayload({
      amount: '1200.50',
      method: 'BANK_TRANSFER',
      reference: '  TXN-9988  ',
      paidAt: new Date('2026-10-07T10:00:00Z'),
      note: '  Initial installment  ',
    });

    expect(payload.amount).toBe(1200.5);
    expect(payload.method).toBe('BANK_TRANSFER');
    expect(payload.reference).toBe('TXN-9988');
    expect(payload.paidAt).toBe('2026-10-07T10:00:00.000Z');
    expect(payload.note).toBe('Initial installment');
  });

  it('clears blanks to null or undefined', () => {
    const payload = buildRecordPaymentPayload({
      amount: 50,
      method: null,
      reference: '   ',
      paidAt: null,
      note: '',
    });

    expect(payload.amount).toBe(50);
    expect(payload.method).toBeNull();
    expect(payload.reference).toBeNull();
    expect(payload.paidAt).toBeUndefined();
    expect(payload.note).toBeNull();
  });
});

describe('formatPayment helpers', () => {
  it('formats payment amounts with currency', () => {
    const formatted = formatPaymentAmount(5000, 'DZD', 'en-GB');
    expect(formatted).toContain('5,000.00');
    expect(formatPaymentAmount(null, 'DZD')).toBe('—');
  });

  it('formats payment dates cleanly', () => {
    const formatted = formatPaymentDate('2026-10-07T10:00:00Z', 'en-GB');
    expect(formatted).toContain('2026');
  });
});
