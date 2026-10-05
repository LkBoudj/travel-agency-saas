import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generatePaymentCode } from './payment-code.js';
import type { RecordPaymentBody } from './payments.schemas.js';
import {
  PAYMENT_BOOKING_SELECT,
  PAYMENT_SELECT,
  remainingAmount,
  sumPayments,
  toPaymentResponse,
  type PaymentBookingRow,
  type PaymentLedgerResponse,
  type PaymentRow,
} from './payments.types.js';

function conflict(
  errorCode: string,
  message: string,
  metadata?: Record<string, unknown>,
): ConflictException {
  return new ConflictException({ statusCode: 409, message, errorCode, ...metadata });
}

/** Booking statuses whose ledger still accepts new payments. */
const SETTLEABLE_BOOKING_STATUSES = new Set(['PENDING', 'CONFIRMED']);

/** Newest payment first; the id breaks ties so the ledger order is total. */
const LEDGER_ORDER_BY = [{ paidAt: 'desc' as const }, { id: 'desc' as const }];

/** The booking row re-read under `FOR UPDATE` inside a payment transaction. */
interface LockedBooking {
  id: bigint;
  status: string;
  currency: string;
  totalAmount: Prisma.Decimal;
}

interface BookingLockRow {
  id: unknown;
  status: string;
  currency: string;
  total_amount: Prisma.Decimal;
}

function toBigInt(value: unknown): bigint {
  return typeof value === 'bigint' ? value : BigInt(String(value));
}

function toDecimal(value: Prisma.Decimal | number): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
}

/**
 * The manual payment ledger of one booking, scoped to ONE route agency.
 *
 * Every method resolves the booking through `:agencyCode` + `:bookingCode`, so
 * an operation issued through agency A's route can only ever touch agency A's
 * bookings: a foreign or stale `BKG-…` code is a 404 and never leaks
 * existence, and a payment row carries no `agency_id` of its own — it inherits
 * tenancy from the booking. No method accepts an agency, booking or payment
 * reference from a request body.
 *
 * Money is server-authoritative. The client sends only the amount it received;
 * the currency is copied from the booking and the paid total and remaining
 * balance are DERIVED here as `totalAmount - SUM(payment.amount)`. Nothing the
 * caller sends can move a balance.
 *
 * The ledger is append-only: there is no update and no delete, and the module
 * migration's triggers reject both at the database, so the paid history of a
 * booking can always be re-derived from the rows that survived.
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The ledger of one booking, newest payment first, with derived balances. */
  async ledger(agencyId: bigint, bookingCode: string): Promise<PaymentLedgerResponse> {
    const booking = await this.requireBooking(agencyId, bookingCode);
    return this.toLedger(booking, await this.readLedger(this.prisma, booking.id));
  }

  /**
   * Records one manual payment against a booking and returns the resulting
   * ledger.
   *
   * The booking row lock (`SELECT … FOR UPDATE`) is the serialization point:
   * two concurrent payments on the same booking queue on it, and each one
   * re-reads the freshly committed ledger under its own lock. That is what
   * makes "paid + this payment <= booking total" hold under concurrency — a
   * check-then-insert outside a lock would let two simultaneous payments each
   * pass a stale remaining balance and jointly overpay the booking.
   */
  async record(
    agencyId: bigint,
    bookingCode: string,
    input: RecordPaymentBody,
    actorCode: string,
  ): Promise<{ payment: PaymentRow; ledger: PaymentLedgerResponse }> {
    const booking = await this.requireBooking(agencyId, bookingCode);
    const amount = new Prisma.Decimal(input.amount.toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockBooking(tx, booking.id);

      if (!SETTLEABLE_BOOKING_STATUSES.has(locked.status)) {
        throw conflict(
          'PAYMENT_BOOKING_CANCELLED',
          'This booking is cancelled and can no longer be settled',
          { bookingCode, bookingStatus: locked.status },
        );
      }

      const paid = sumPayments(await this.readAmounts(tx, locked.id));
      const remaining = remainingAmount(locked.totalAmount, paid);

      if (amount.greaterThan(remaining)) {
        throw conflict(
          'PAYMENT_OVERPAYMENT',
          'This payment is greater than the remaining balance of the booking',
          {
            bookingCode,
            amount: amount.toNumber(),
            paidAmount: paid.toNumber(),
            remainingAmount: remaining.toNumber(),
          },
        );
      }

      const payment = await tx.payment.create({
        data: {
          code: generatePaymentCode(),
          bookingId: locked.id,
          amount,
          // One booking is settled in exactly one currency: the payment
          // inherits the booking's, so a mixed-currency ledger is impossible by
          // construction rather than by validating a client-supplied value.
          currency: locked.currency,
          method: input.method ?? null,
          reference: input.reference ?? null,
          note: input.note ?? null,
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
          recordedByCode: actorCode,
        },
        select: PAYMENT_SELECT,
      });

      // The ledger is re-read rather than patched so the response can never
      // disagree with what was actually committed.
      const ledger = this.toLedger(
        {
          ...booking,
          status: locked.status,
          currency: locked.currency,
          totalAmount: locked.totalAmount,
        },
        await this.readLedger(tx, locked.id),
      );

      return { payment, ledger };
    });
  }

  private async readLedger(
    client: Prisma.TransactionClient | PrismaService,
    bookingId: bigint,
  ): Promise<PaymentRow[]> {
    return client.payment.findMany({
      where: { bookingId },
      select: PAYMENT_SELECT,
      orderBy: LEDGER_ORDER_BY,
    });
  }

  private async readAmounts(
    client: Prisma.TransactionClient | PrismaService,
    bookingId: bigint,
  ): Promise<Array<{ amount: Prisma.Decimal | number }>> {
    return client.payment.findMany({
      where: { bookingId },
      select: { amount: true },
    });
  }

  private toLedger(booking: PaymentBookingRow, payments: PaymentRow[]): PaymentLedgerResponse {
    const paidAmount = sumPayments(payments);
    return {
      bookingCode: booking.code,
      currency: booking.currency,
      totalAmount: toDecimal(booking.totalAmount).toNumber(),
      paidAmount: paidAmount.toNumber(),
      remainingAmount: remainingAmount(booking.totalAmount, paidAmount).toNumber(),
      payments: payments.map(toPaymentResponse),
    };
  }

  private async requireBooking(
    agencyId: bigint,
    code: string,
  ): Promise<PaymentBookingRow> {
    const booking = await this.prisma.booking.findFirst({
      where: { agencyId, code },
      select: PAYMENT_BOOKING_SELECT,
    });
    if (!booking) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That booking was not found in this agency',
        errorCode: 'BOOKING_NOT_FOUND',
      });
    }
    return booking;
  }

  /**
   * `SELECT ... FOR UPDATE` on the booking row inside the caller's
   * transaction. This is the serialization point for the ledger: concurrent
   * payments on one booking queue here and each re-reads the committed state
   * under its own lock.
   */
  private async lockBooking(
    tx: Prisma.TransactionClient,
    bookingId: bigint,
  ): Promise<LockedBooking> {
    const rows = await tx.$queryRaw<BookingLockRow[]>`
      SELECT id, status, currency, total_amount
      FROM booking
      WHERE id = ${bookingId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That booking was not found in this agency',
        errorCode: 'BOOKING_NOT_FOUND',
      });
    }
    return {
      id: toBigInt(row.id),
      status: row.status,
      currency: row.currency,
      totalAmount: toDecimal(row.total_amount),
    };
  }
}