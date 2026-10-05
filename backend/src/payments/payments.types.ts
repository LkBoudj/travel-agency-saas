import { Prisma } from '../generated/prisma/client.js';
import type { PaymentMethod } from './payments.schemas.js';

/**
 * One recorded manual payment of a Booking (Module K).
 *
 * The contract exposes the public `PAY-…` code and the recorded facts. The
 * `currency` is present on every row (it is frozen from the booking) so a
 * ledger read is self-describing even if a booking's own currency is edited
 * out of scope later.
 */
export interface PaymentResponse {
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

/**
 * The payment ledger of one booking, with the balances derived server-side.
 *
 * `totalAmount` is the booking's frozen total, `paidAmount` is the sum of the
 * ledger rows and `remainingAmount` is their difference — all three computed
 * by the backend inside the booking row lock, never supplied by the client.
 * `remainingAmount` is `0` once the booking is fully settled and can never be
 * negative: the service rejects a payment that would push it below zero.
 */
export interface PaymentLedgerResponse {
  bookingCode: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: PaymentResponse[];
}

/** The columns one payment row renders. */
export const PAYMENT_SELECT = {
  code: true,
  amount: true,
  currency: true,
  method: true,
  reference: true,
  note: true,
  paidAt: true,
  recordedByCode: true,
  createdAt: true,
} as const satisfies Prisma.PaymentSelect;

export type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof PAYMENT_SELECT }>;

/**
 * The booking columns this module resolves before touching the ledger: the id
 * for scoping every payment row, the public code for the response, the frozen
 * `totalAmount` the remaining balance is derived from, the `currency` every
 * payment inherits, and the `status` that decides whether the booking is still
 * settleable.
 */
export const PAYMENT_BOOKING_SELECT = {
  id: true,
  code: true,
  status: true,
  currency: true,
  totalAmount: true,
} as const satisfies Prisma.BookingSelect;

export type PaymentBookingRow = Prisma.BookingGetPayload<{
  select: typeof PAYMENT_BOOKING_SELECT;
}>;

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

/** Normalizes a Decimal-or-number into a `Decimal`, the only money currency. */
export function toDecimal(value: Prisma.Decimal | number): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
}

export function toPaymentResponse(row: PaymentRow): PaymentResponse {
  return {
    code: row.code,
    amount: toNumber(row.amount),
    currency: row.currency,
    method: (row.method as PaymentMethod | null) ?? null,
    reference: row.reference,
    note: row.note,
    paidAt: row.paidAt.toISOString(),
    recordedByCode: row.recordedByCode,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Sums the ledger in integer minor units.
 *
 * Monetary arithmetic never runs on raw floats: each amount is scaled to
 * hundredths, added as an integer and scaled back once, so a booking's paid
 * total is exact rather than "close enough". `scaleToMinor` is the single
 * place where a Decimal leaves money-land.
 */
export function sumPayments(payments: Array<{ amount: Prisma.Decimal | number }>): Prisma.Decimal {
  const MINOR_UNITS = new Prisma.Decimal(100);
  const total = payments.reduce((sum, payment) => {
    const decimal = toDecimal(payment.amount);
    const scaled = decimal.mul(MINOR_UNITS);
    if (!scaled.eq(scaled.toDecimalPlaces(0))) {
      throw new Error(`Payment amount ${decimal.toString()} has more precision than 2 decimals`);
    }
    return sum + BigInt(scaled.toFixed(0));
  }, 0n);

  return new Prisma.Decimal(total.toString()).div(MINOR_UNITS);
}

/**
 * Derives the remaining balance from the booking total and the ledger.
 *
 * The remaining balance is clamped at 0 purely as a defence in depth: the
 * service already refuses a payment that would overpay, so a negative value
 * reaching here would mean the ledger and the total disagree. Clamping keeps
 * the UI from ever rendering a negative balance instead of surfacing it.
 */
export function remainingAmount(
  totalAmount: Prisma.Decimal | number,
  paidAmount: Prisma.Decimal,
): Prisma.Decimal {
  const remaining = toDecimal(totalAmount).minus(paidAmount);
  return remaining.isNegative() ? new Prisma.Decimal(0) : remaining;
}