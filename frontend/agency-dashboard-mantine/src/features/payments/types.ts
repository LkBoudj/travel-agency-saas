/**
 * Module K payments contracts, mirrored from `backend/src/payments`.
 *
 * A payment is recorded against one booking (`:agencyCode` + `:bookingCode`).
 * Tenancy and booking resolution are server-side concerns.
 */

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'OTHER'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  code: string;
  amount: number;
  currency: string;
  method: PaymentMethod | null;
  reference: string | null;
  note: string | null;
  paidAt: string;
  recordedByCode: string | null;
  createdAt: string;
}

export interface PaymentLedger {
  bookingCode: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: Payment[];
}

export interface RecordPaymentPayload {
  amount: number;
  method?: PaymentMethod | null;
  reference?: string | null;
  paidAt?: string;
  note?: string | null;
}
