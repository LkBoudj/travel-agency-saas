import type { Prisma } from '../generated/prisma/client.js';
import type { PricingBasis } from '../pricing/pricing.types.js';

/**
 * Booking lifecycle vocabulary, enforced by the `booking_status_check`
 * constraint.
 *
 * - `PENDING`   — created, holds reserved seats.
 * - `CONFIRMED` — reserved seats are now also "confirmed". In Module I a
 *   booking may not reach CONFIRMED yet: confirmation is readiness-gated on the
 *   Booking's Traveler records, which arrive in Module J.
 * - `CANCELLED` — one-way release of the reserved seats.
 */
export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses whose `reservedSeats` count against departure capacity. */
export const BOOKING_ACTIVE_STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
] as const;

/**
 * The public shape of a booking in the list contract. Tenancy is the route's
 * `:agencyCode`; the booking itself exposes only public codes of its customer,
 * tour and departure, never database ids.
 */
export interface BookingResponse {
  code: string;
  status: BookingStatus;
  customer: {
    code: string;
    firstName: string | null;
    lastName: string | null;
  };
  tour: {
    code: string;
    name: string;
  };
  departure: {
    code: string;
    startAt: string;
  };
  reservedSeats: number;
  currency: string;
  totalAmount: number;
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A row of the booked pricing snapshot: the option was freezed at creation
 * time so later option/price edits never rewrite a stored booking's ledger.
 */
export interface BookingPriceLineResponse {
  pricingOptionCode: string;
  pricingOptionName: string;
  basis: PricingBasis;
  currency: string;
  unitAmount: number;
  quantity: number;
  lineTotal: number;
}

export interface BookingStatusHistoryResponse {
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorCode: string | null;
  reason: string | null;
  createdAt: string;
}

export interface BookingDetailResponse extends BookingResponse {
  priceLines: BookingPriceLineResponse[];
  statusHistory: BookingStatusHistoryResponse[];
}

/**
 * The columns the list and detail contracts render for a booking, without the
 * never-exposed internals (ids, tenant references). Price lines and status
 * history are appended to this select by the detail flow.
 */
export const BOOKING_LIST_SELECT = {
  code: true,
  status: true,
  reservedSeats: true,
  currency: true,
  totalAmount: true,
  notes: true,
  confirmedAt: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { code: true, firstName: true, lastName: true } },
  tour: { select: { code: true, name: true } },
  departure: { select: { code: true, startAt: true } },
} as const satisfies Prisma.BookingSelect;

export type BookingListRow = Prisma.BookingGetPayload<{
  select: typeof BOOKING_LIST_SELECT;
}>;

/** The minimum booking shape the mutation flows need to lock and retarget. */
export const BOOKING_ROW_SELECT = {
  id: true,
  code: true,
  status: true,
  departureId: true,
} as const satisfies Prisma.BookingSelect;

export type BookingRow = Prisma.BookingGetPayload<{
  select: typeof BOOKING_ROW_SELECT;
}>;

export const BOOKING_DETAIL_SELECT = {
  ...BOOKING_LIST_SELECT,
  priceLines: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      optionCode: true,
      optionName: true,
      basis: true,
      currency: true,
      unitAmount: true,
      quantity: true,
      lineTotal: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: {
      fromStatus: true,
      toStatus: true,
      actorCode: true,
      reason: true,
      createdAt: true,
    },
  },
} as const satisfies Prisma.BookingSelect;

export type BookingDetailRow = Prisma.BookingGetPayload<{
  select: typeof BOOKING_DETAIL_SELECT;
}>;

export function toBookingResponse(row: BookingListRow): BookingResponse {
  return {
    code: row.code,
    status: row.status as BookingStatus,
    customer: {
      code: row.customer.code,
      firstName: row.customer.firstName,
      lastName: row.customer.lastName,
    },
    tour: {
      code: row.tour.code,
      name: row.tour.name,
    },
    departure: {
      code: row.departure.code,
      startAt: row.departure.startAt.toISOString(),
    },
    reservedSeats: row.reservedSeats,
    currency: row.currency,
    totalAmount: toNumber(row.totalAmount),
    notes: row.notes,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toBookingDetailResponse(
  row: BookingDetailRow,
): BookingDetailResponse {
  return {
    ...toBookingResponse(row),
    priceLines: row.priceLines.map((line) => ({
      pricingOptionCode: line.optionCode,
      pricingOptionName: line.optionName,
      basis: line.basis as PricingBasis,
      currency: line.currency,
      unitAmount: toNumber(line.unitAmount),
      quantity: line.quantity,
      lineTotal: toNumber(line.lineTotal),
    })),
    statusHistory: row.statusHistory.map((entry) => ({
      fromStatus: (entry.fromStatus ?? null) as BookingStatus | null,
      toStatus: entry.toStatus as BookingStatus,
      actorCode: entry.actorCode,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

/** Prisma returns NUMERIC/DECIMAL as a Decimal; the contract uses numbers. */
function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}