import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateBookingCode } from './booking-code.js';
import type {
  CancelBookingBody,
  CreateBookingBody,
  ListBookingsQuery,
} from './bookings.schemas.js';
import {
  BOOKING_ACTIVE_STATUSES,
  BOOKING_DETAIL_SELECT,
  BOOKING_LIST_SELECT,
  BOOKING_ROW_SELECT,
  toBookingDetailResponse,
  toBookingResponse,
  type BookingDetailResponse,
  type BookingResponse,
} from './bookings.types.js';

const DEFAULT_CURRENCY = 'DZD';
const MAX_TOTAL = new Prisma.Decimal('9999999999.99');

function conflict(errorCode: string, message: string) {
  return new ConflictException({ statusCode: 409, message, errorCode });
}

/** The departure row re-read under `FOR UPDATE` inside a booking transaction. */
interface LockedDeparture {
  id: bigint;
  tourId: bigint;
  status: string;
  capacity: number;
  startAt: Date;
  bookingDeadline: Date | null;
}

interface DepartureLockRow {
  id: unknown;
  tour_id: unknown;
  status: string;
  capacity: unknown;
  start_at: Date;
  booking_deadline: Date | null;
}

/** A `DeparturePrice` joined with its option definition, as the snapshot reads it. */
interface PriceReference {
  id: bigint;
  code: string;
  name: string;
  basis: string;
  currency: string;
  status: string;
  amount: Prisma.Decimal;
}

/** One frozen price line draft computed for a booking. */
interface PriceLineDraft {
  optionId: bigint | null;
  code: string;
  name: string;
  basis: string;
  currency: string;
  amount: Prisma.Decimal;
  quantity: number;
  total: Prisma.Decimal;
}

function toBigInt(value: unknown): bigint {
  return typeof value === 'bigint' ? value : BigInt(String(value));
}

/**
 * Agency bookings, scoped to ONE route agency.
 *
 * Every method resolves its subjects through the `agencyId` the guard already
 * resolved from the route, so operations issued through agency A's route can
 * only ever touch agency A's customers and agency A's tours/departures. A
 * foreign or stale `CUS-...`/`DEP-...`/`BKG-...` code is a 404 and never leaks
 * existence. No method accepts an agency, status, amount or total from a
 * request body.
 *
 * Capacity model (Module I):
 * - A Booking owns an immutable `reservedSeats` claim, always created PENDING.
 * - Seat consumption is DERIVED: the active seats of a Departure are the sum
 *   of `reservedSeats` over its PENDING and CONFIRMED bookings; a CANCELLED
 *   booking releases its claim. There is deliberately no counter to drift.
 * - Every operation that consumes or releases seats (`create`, `cancel`) runs
 *   inside one interactive transaction that first takes a `SELECT ... FOR
 *   UPDATE` on the Departure row, so concurrent bookings of the same departure
 *   serialize on the row instead of racing on the derived count.
 * - `bookedSeats + reservedSeats > capacity` is rejected before any write.
 * - A departure only accepts new bookings while its Tour is published (not
 *   ARCHIVED), it is OPEN, the booking deadline has not passed, and it has not
 *   started.
 *
 * Money model (Module I):
 * - The client never supplies amounts or a total. The backend reads the
 *   departure's stored `DeparturePrice` rows and applies each option's basis:
 *   `per_person` => quantity `reservedSeats`, `per_booking` => quantity 1.
 * - The snapshot is frozen into `booking_price_line` rows at creation, so a
 *   later rename, reprice or deactivation never rewrites a stored booking.
 * - One booking has one currency (the tour's single currency); mixed-currency
 *   selections are rejected.
 *
 * Lifecycle model (Module I):
 * - `PENDING -> CANCELLED` is available through the cancel action.
 * - Confirmation is readiness-gated on the Booking's Traveler records, which
 *   arrive in Module J: the transition contract is enforced here but no PENDING
 *   booking can actually reach CONFIRMED yet, so no historical CONFIRMED
 *   booking with zero Travelers can ever exist.
 */
@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------- read

  async list(
    agencyId: bigint,
    query: ListBookingsQuery,
  ): Promise<BookingResponse[]> {
    const search = query.search?.trim();
    const contains = search
      ? { contains: search, mode: 'insensitive' as const }
      : undefined;

    const bookings = await this.prisma.booking.findMany({
      where: {
        agencyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.customerCode ? { customer: { code: query.customerCode } } : {}),
        ...(query.departureCode
          ? { departure: { code: query.departureCode } }
          : {}),
        ...(contains
          ? {
              OR: [
                { code: contains },
                {
                  customer: {
                    OR: [{ firstName: contains }, { lastName: contains }],
                  },
                },
                { departure: { code: contains } },
                { tour: { name: contains } },
              ],
            }
          : {}),
      },
      select: BOOKING_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map(toBookingResponse);
  }

  async getByCode(
    agencyId: bigint,
    bookingCode: string,
  ): Promise<BookingDetailResponse> {
    const booking = await this.requireBooking(
      agencyId,
      bookingCode,
      BOOKING_DETAIL_SELECT,
    );
    return toBookingDetailResponse(booking);
  }

  // ----------------------------------------------------------------- create

  async create(
    agencyId: bigint,
    input: CreateBookingBody,
    actorCode: string,
  ): Promise<BookingResponse> {
    const customer = await this.requireCustomer(agencyId, input.customerCode);
    if (customer.status === 'ARCHIVED') {
      throw conflict(
        'CUSTOMER_ARCHIVED',
        'An archived customer cannot create new bookings',
      );
    }
    const departureId = await this.resolveDepartureId(agencyId, input.departureCode);

    const created = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockDeparture(tx, departureId);
      await this.assertDepartureBookable(tx, locked);

      const priceSet = await this.loadPriceSet(tx, locked.id);
      const snapshot = this.buildSnapshot(
        input.pricingSelections,
        input.reservedSeats,
        priceSet,
      );

      const used = await this.bookedSeats(tx, locked.id);
      if (used + input.reservedSeats > locked.capacity) {
        throw conflict(
          'BOOKING_CAPACITY_EXCEEDED',
          `This booking needs ${input.reservedSeats} seat(s), but only ${
            locked.capacity - used
          } remain on this departure`,
        );
      }

      const booking = await tx.booking.create({
        data: {
          code: generateBookingCode(),
          agencyId,
          customerId: customer.id,
          tourId: locked.tourId,
          departureId: locked.id,
          status: 'PENDING',
          reservedSeats: input.reservedSeats,
          currency: snapshot.currency ?? DEFAULT_CURRENCY,
          totalAmount: snapshot.total,
          notes: input.notes ?? null,
        },
        select: { id: true, ...BOOKING_LIST_SELECT },
      });

      if (snapshot.priceLines.length > 0) {
        await tx.bookingPriceLine.createMany({
          data: snapshot.priceLines.map((line) => ({
            bookingId: booking.id,
            pricingOptionId: line.optionId,
            optionCode: line.code,
            optionName: line.name,
            basis: line.basis,
            currency: line.currency,
            unitAmount: line.amount,
            quantity: line.quantity,
            lineTotal: line.total,
          })),
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: 'PENDING',
          actorCode,
        },
      });

      return booking;
    });

    return toBookingResponse(created);
  }

  // ---------------------------------------------------------------- lifecycle

  /**
   * The PENDING -> CONFIRMED transition.
   *
   * Confirmation is readiness-gated on the Booking's Traveler records
   * (tickets must exist before a PENDING booking can be confirmed), which
   * arrive in Module J. Until then no booking is confirmable: this enforces
   * the transition contract (valid origin state) and then refuses with a
   * dedicated error, so no historical CONFIRMED booking with zero Travelers
   * can ever be written.
   */
  async confirm(agencyId: bigint, bookingCode: string): Promise<BookingResponse> {
    const booking = await this.requireBooking(
      agencyId,
      bookingCode,
      BOOKING_ROW_SELECT,
    );

    if (booking.status === 'CONFIRMED') {
      throw conflict('BOOKING_ALREADY_CONFIRMED', 'This booking is already confirmed');
    }
    if (booking.status === 'CANCELLED') {
      throw conflict(
        'BOOKING_INVALID_TRANSITION',
        'A cancelled booking cannot be confirmed',
      );
    }

    throw conflict(
      'BOOKING_TRAVELERS_REQUIRED',
      "Confirmation requires the booking's Traveler records, which are not implemented yet",
    );
  }

  /**
   * The PENDING/CONFIRMED -> CANCELLED transition, one-way. Runs under the
   * same departure lock as creation so the released seats become visible to
   * concurrent bookings atomically, and appends the transition to the booking's
   * status history inside the same transaction.
   */
  async cancel(
    agencyId: bigint,
    bookingCode: string,
    input: CancelBookingBody,
    actorCode: string,
  ): Promise<BookingResponse> {
    const booking = await this.requireBooking(
      agencyId,
      bookingCode,
      BOOKING_ROW_SELECT,
    );

    if (booking.status === 'CANCELLED') {
      throw conflict('BOOKING_ALREADY_CANCELLED', 'This booking is already cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.lockDeparture(tx, booking.departureId);

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: input.reason ?? null,
        },
        select: { id: true },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'CANCELLED',
          actorCode,
          reason: input.reason ?? null,
        },
      });
    });

    return toBookingResponse(
      await this.requireBooking(agencyId, bookingCode, BOOKING_LIST_SELECT),
    );
  }

  // ---------------------------------------------------------------- helpers

  private async requireBooking<T extends Prisma.BookingSelect>(
    agencyId: bigint,
    code: string,
    select: T,
  ): Promise<Prisma.BookingGetPayload<{ select: T }>> {
    const booking = await this.prisma.booking.findFirst({
      where: { agencyId, code },
      select,
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

  private async requireCustomer(
    agencyId: bigint,
    code: string,
  ): Promise<{ id: bigint; status: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: { agencyId, code },
      select: { id: true, status: true },
    });
    if (!customer) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That customer was not found in this agency',
        errorCode: 'CUSTOMER_NOT_FOUND',
      });
    }
    return customer;
  }

  /** Resolves the departure through its tour so tenancy is inherited, not input. */
  private async resolveDepartureId(agencyId: bigint, code: string): Promise<bigint> {
    const departure = await this.prisma.departure.findFirst({
      where: { code, tour: { agencyId } },
      select: { id: true },
    });
    if (!departure) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That departure was not found in this agency',
        errorCode: 'DEPARTURE_NOT_FOUND',
      });
    }
    return departure.id;
  }

  /**
   * `SELECT ... FOR UPDATE` on the departure row inside the caller's
   * transaction. This is the serialization point for seat consumption: two
   * concurrent creations on the same departure queue on this lock, and the
   * second one re-reads the freshly committed seats under its own lock.
   */
  private async lockDeparture(
    tx: Prisma.TransactionClient,
    departureId: bigint,
  ): Promise<LockedDeparture> {
    const rows = await tx.$queryRaw<DepartureLockRow[]>`
      SELECT id, tour_id, status, capacity, start_at, booking_deadline
      FROM departure
      WHERE id = ${departureId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That departure does not exist',
        errorCode: 'DEPARTURE_NOT_FOUND',
      });
    }
    return {
      id: toBigInt(row.id),
      tourId: toBigInt(row.tour_id),
      status: row.status,
      capacity: Number(row.capacity),
      startAt: row.start_at,
      bookingDeadline: row.booking_deadline,
    };
  }

  private async assertDepartureBookable(
    tx: Prisma.TransactionClient,
    departure: LockedDeparture,
  ): Promise<void> {
    const tourStatus = await tx.tour.findUnique({
      where: { id: departure.tourId },
      select: { status: true },
    });
    if (tourStatus?.status === 'ARCHIVED') {
      throw conflict(
        'BOOKING_TOUR_ARCHIVED',
        'An archived tour cannot accept new bookings',
      );
    }

    if (departure.status === 'CLOSED' || departure.status === 'CANCELLED') {
      throw conflict(
        'BOOKING_DEPARTURE_NOT_OPEN',
        'Only open departures can accept bookings',
      );
    }

    const now = new Date();
    if (
      departure.bookingDeadline &&
      now.getTime() > departure.bookingDeadline.getTime()
    ) {
      throw conflict(
        'BOOKING_DEADLINE_PASSED',
        'The booking deadline for this departure has passed',
      );
    }
    if (now.getTime() >= departure.startAt.getTime()) {
      throw conflict('BOOKING_DEPARTURE_STARTED', 'This departure has already started');
    }
  }

  /** All stored prices of the departure, joined with their option definitions. */
  private async loadPriceSet(
    tx: Prisma.TransactionClient,
    departureId: bigint,
  ): Promise<PriceReference[]> {
    const rows = await tx.departurePrice.findMany({
      where: { departureId },
      select: {
        amount: true,
        pricingOption: {
          select: {
            id: true,
            code: true,
            name: true,
            basis: true,
            currency: true,
            status: true,
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.pricingOption.id,
      code: row.pricingOption.code,
      name: row.pricingOption.name,
      basis: row.pricingOption.basis,
      currency: row.pricingOption.currency,
      status: row.pricingOption.status,
      amount: row.amount,
    }));
  }

  /**
   * Computes the frozen price snapshot from the client's option-code
   * selections. The client names choices by code only; every amount is read
   * from the stored `DeparturePrice`, so a booking ledger never trusts input.
   */
  private buildSnapshot(
    selections: string[],
    reservedSeats: number,
    priceSet: PriceReference[],
  ): { priceLines: PriceLineDraft[]; currency: string | null; total: Prisma.Decimal } {
    const byCode = new Map(priceSet.map((option) => [option.code, option]));
    const lines: PriceLineDraft[] = [];
    let currency: string | null = null;
    let total = new Prisma.Decimal(0);

    for (const code of selections) {
      const option = byCode.get(code);
      if (!option) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Option "${code}" has no price on this departure`,
          errorCode: 'BOOKING_PRICE_OPTION_NOT_FOUND',
        });
      }
      if (option.status !== 'ACTIVE') {
        throw conflict(
          'BOOKING_PRICE_OPTION_INACTIVE',
          `The option "${option.name}" is inactive and cannot be booked`,
        );
      }
      if (currency && currency !== option.currency) {
        throw conflict(
          'BOOKING_CURRENCY_MISMATCH',
          'A booking can only use one currency',
        );
      }
      currency = option.currency;

      const quantity = option.basis === 'per_booking' ? 1 : reservedSeats;
      const amount = new Prisma.Decimal(option.amount);
      const totalPerLine = amount.mul(quantity);
      total = total.add(totalPerLine);

      lines.push({
        optionId: option.id,
        code: option.code,
        name: option.name,
        basis: option.basis,
        currency: option.currency,
        amount,
        quantity,
        total: totalPerLine,
      });
    }

    if (total.greaterThan(MAX_TOTAL)) {
      throw conflict(
        'BOOKING_TOTAL_EXCEEDS_LIMIT',
        'The booking total exceeds the supported maximum',
      );
    }

    return { priceLines: lines, currency, total };
  }

  /** Derived seat consumption of one departure under the caller's transaction. */
  private async bookedSeats(
    tx: Prisma.TransactionClient,
    departureId: bigint,
  ): Promise<number> {
    const aggregate = await tx.booking.aggregate({
      where: { departureId, status: { in: [...BOOKING_ACTIVE_STATUSES] } },
      _sum: { reservedSeats: true },
    });
    return aggregate._sum.reservedSeats ?? 0;
  }
}