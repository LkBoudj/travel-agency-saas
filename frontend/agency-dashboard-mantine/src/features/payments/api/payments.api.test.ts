import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../services/api.ts';
import { requestBookingPaymentLedger, requestRecordPayment } from './payments.api.ts';

vi.mock('../../../services/api.ts', () => ({
  apiRequest: vi.fn(),
}));

describe('payments.api', () => {
  it('requests booking payment ledger with encoded parameters', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      bookingCode: 'BKG-001',
      currency: 'DZD',
      totalAmount: 50000,
      paidAmount: 20000,
      remainingAmount: 30000,
      payments: [],
    });

    const result = await requestBookingPaymentLedger('AGY/TEST', 'BKG/123');

    expect(apiRequest).toHaveBeenCalledWith('/v1/agencies/AGY%2FTEST/bookings/BKG%2F123/payments');
    expect(result.remainingAmount).toBe(30000);
  });

  it('records payment against a booking with POST and serialized body', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      bookingCode: 'BKG-001',
      currency: 'DZD',
      totalAmount: 50000,
      paidAmount: 50000,
      remainingAmount: 0,
      payments: [],
    });

    const payload = {
      amount: 30000,
      method: 'CASH' as const,
      reference: 'TXN-01',
      note: 'Settled in full',
    };

    const result = await requestRecordPayment('AGY-1', 'BKG-1', payload);

    expect(apiRequest).toHaveBeenCalledWith('/v1/agencies/AGY-1/bookings/BKG-1/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result.remainingAmount).toBe(0);
  });
});
