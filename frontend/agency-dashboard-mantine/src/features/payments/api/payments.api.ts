import { apiRequest } from '../../../services/api.ts';
import type { PaymentLedger, RecordPaymentPayload } from '../types.ts';

function base(agencyCode: string): string {
  return `/v1/agencies/${encodeURIComponent(agencyCode)}`;
}

/**
 * Gets the payment ledger for one booking.
 *
 * Scoped to `:agencyCode` and `:bookingCode`. Total amount, paid amount, and
 * remaining balance are derived server-side.
 */
export function requestBookingPaymentLedger(
  agencyCode: string,
  bookingCode: string
): Promise<PaymentLedger> {
  return apiRequest<PaymentLedger>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/payments`
  );
}

/**
 * Records a manual payment against one booking.
 *
 * Scoped to `:agencyCode` and `:bookingCode`. Backend checks for overpayment
 * under a booking row lock.
 */
export function requestRecordPayment(
  agencyCode: string,
  bookingCode: string,
  payload: RecordPaymentPayload
): Promise<PaymentLedger> {
  return apiRequest<PaymentLedger>(
    `${base(agencyCode)}/bookings/${encodeURIComponent(bookingCode)}/payments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}
