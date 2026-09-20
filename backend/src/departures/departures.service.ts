import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BOOKING_ACTIVE_STATUSES } from '../bookings/bookings.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateDepartureCode } from './departure-code.js';
import type {
  CreateDepartureBody,
  ListDeparturesQuery,
  UpdateDepartureBody,
} from './departures.schemas.js';
import {
  DEPARTURE_SELECT,
  toDepartureResponse,
  type DepartureResponse,
  type DepartureRow,
} from './departures.types.js';

type DepartureWithId = DepartureRow & { id: bigint };

const TOUR_SCOPE_SELECT = {
  id: true,
  code: true,
  status: true,
} as const satisfies Prisma.TourSelect;

type TourScope = Prisma.TourGetPayload<{ select: typeof TOUR_SCOPE_SELECT }>;

/** What a cancellation left behind, for the audit trail and the dashboard warn. */
export interface DepartureCancelResult {
  departure: DepartureResponse;
  tourStatus: string;
  remainingOpenDepartures: number;
}

function conflict(errorCode: string, message: string) {
  return new ConflictException({ statusCode: 409, message, errorCode });
}

/**
 * Agency departures (scheduled runs of a tour), scoped to ONE route agency.
 *
 * Every method resolves the owning tour through the `agencyId` the guard
 * already resolved from the route, so operations issued through agency A's
 * route can only ever read or mutate departures of agency A's tours. A foreign
 * or stale `TUR-...`/`DEP-...` code is a 404 and never leaks existence. No
 * method accepts a tour or agency identifier from a request body.
 *
 * Lifecycle model (Module G):
 * - Create always lands OPEN. The backend NEVER auto-publishes; a new
 *   departure changes nothing about its tour's status.
 * - `PUT` is a full replacement of the operational fields and may move the
 *   status between OPEN and CLOSED.
 * - CANCELLED is terminal and one-way, an explicit `cancel` action. Cancelling
 *   the last OPEN departure of a PUBLISHED SCHEDULED tour NEVER changes the
 *   tour status silently — the tour stays PUBLISHED and a later publish
 *   attempt still runs the normal readiness gate (which requires at least one
 *   OPEN departure for SCHEDULED tours).
 */
@Injectable()
export class DeparturesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    agencyId: bigint,
    tourCode: string,
    query: ListDeparturesQuery,
  ): Promise<DepartureResponse[]> {
    const tour = await this.requireTour(agencyId, tourCode);

    const departures = await this.prisma.departure.findMany({
      where: {
        tourId: tour.id,
        ...(query.status ? { status: query.status } : {}),
      },
      select: DEPARTURE_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return departures.map(toDepartureResponse);
  }

  async getByCode(
    agencyId: bigint,
    tourCode: string,
    departureCode: string,
  ): Promise<DepartureResponse> {
    return toDepartureResponse(
      await this.requireDeparture(agencyId, tourCode, departureCode),
    );
  }

  async create(
    agencyId: bigint,
    tourCode: string,
    input: CreateDepartureBody,
  ): Promise<DepartureResponse> {
    const tour = await this.requireTour(agencyId, tourCode);

    const created = await this.prisma.departure.create({
      data: {
        tourId: tour.id,
        code: generateDepartureCode(),
        // Status is never accepted from the body: a new departure starts OPEN.
        status: 'OPEN',
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        capacity: input.capacity,
        bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline) : null,
        notes: input.notes ?? null,
      },
      select: DEPARTURE_SELECT,
    });

    return toDepartureResponse(created);
  }

  async update(
    agencyId: bigint,
    tourCode: string,
    departureCode: string,
    input: UpdateDepartureBody,
  ): Promise<DepartureResponse> {
    const departure = await this.requireDeparture(agencyId, tourCode, departureCode);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Re-read and lock the row so the capacity check cannot race a booking.
      const status = await this.lockDepartureStatus(tx, departure.id);
      if (status === 'CANCELLED') {
        throw conflict(
          'DEPARTURE_ALREADY_CANCELLED',
          'A cancelled departure cannot be edited',
        );
      }

      const used = await this.activeReservedSeats(tx, departure.id);
      if (input.capacity < used) {
        throw conflict(
          'DEPARTURE_CAPACITY_BELOW_RESERVED',
          `Cannot reduce capacity below the ${used} seat(s) already reserved on this departure`,
        );
      }

      return tx.departure.update({
        where: { id: departure.id },
        data: {
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          capacity: input.capacity,
          bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline) : null,
          notes: input.notes ?? null,
          status: input.status,
        },
        select: DEPARTURE_SELECT,
      });
    });

    return toDepartureResponse(updated);
  }

  /**
   * One-way cancellation. Active bookings (PENDING/CONFIRMED) block it with
   * DEPARTURE_HAS_ACTIVE_BOOKINGS: a departure with reserved seats may only
   * be cancelled once its bookings are cancelled first. The tour's status is
   * never touched implicitly: a PUBLISHED SCHEDULED tour that loses its last
   * OPEN departure stays PUBLISHED (the dashboard surfaces the empty-schedule
   * warning instead), and a later publish attempt re-runs the normal readiness
   * gate.
   */
  async cancel(
    agencyId: bigint,
    tourCode: string,
    departureCode: string,
  ): Promise<DepartureCancelResult> {
    const tour = await this.requireTour(agencyId, tourCode);
    const departure = await this.requireDepartureByTour(tour.id, departureCode);

    if (departure.status === 'CANCELLED') {
      throw conflict(
        'DEPARTURE_ALREADY_CANCELLED',
        'This departure is already cancelled',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-read and lock the row so a concurrent booking cannot slip through.
      const status = await this.lockDepartureStatus(tx, departure.id);
      if (status === 'CANCELLED') {
        throw conflict(
          'DEPARTURE_ALREADY_CANCELLED',
          'This departure is already cancelled',
        );
      }

      const used = await this.activeReservedSeats(tx, departure.id);
      if (used > 0) {
        throw conflict(
          'DEPARTURE_HAS_ACTIVE_BOOKINGS',
          `Cannot cancel a departure with ${used} active reserved seat(s); cancel its bookings first`,
        );
      }

      await tx.departure.update({
        where: { id: departure.id },
        data: { status: 'CANCELLED' },
        select: { id: true },
      });
    });

    const updated = await this.requireDepartureByTour(tour.id, departureCode);
    const remainingOpenDepartures = await this.prisma.departure.count({
      where: { tourId: tour.id, status: 'OPEN' },
    });

    return {
      departure: toDepartureResponse(updated),
      tourStatus: tour.status,
      remainingOpenDepartures,
    };
  }

  // ------------------------------------------------------------------ helpers

  /**
   * `SELECT status ... FOR UPDATE` on the departure row inside the caller's
   * transaction. This is the serialization point shared with the Bookings
   * module: seat-consuming operations (booking creation) and seat-affecting
   * departure edits (`update`, `cancel`) queue on the same row instead of
   * racing on the derived seat count.
   */
  private async lockDepartureStatus(
    tx: Prisma.TransactionClient,
    departureId: bigint,
  ): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ status: string }>>`
      SELECT status
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
    return row.status;
  }

  /** Derived active seat consumption of a departure, under the caller's lock. */
  private async activeReservedSeats(
    tx: Prisma.TransactionClient,
    departureId: bigint,
  ): Promise<number> {
    const aggregate = await tx.booking.aggregate({
      where: { departureId, status: { in: [...BOOKING_ACTIVE_STATUSES] } },
      _sum: { reservedSeats: true },
    });
    return aggregate._sum.reservedSeats ?? 0;
  }

  /** A foreign or stale `TUR-...` code is a 404 in this agency, never a leak. */
  private async requireTour(agencyId: bigint, tourCode: string): Promise<TourScope> {
    const tour = await this.prisma.tour.findFirst({
      where: { agencyId, code: tourCode },
      select: TOUR_SCOPE_SELECT,
    });
    if (!tour) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That tour was not found in this agency',
        errorCode: 'TOUR_NOT_FOUND',
      });
    }
    return tour;
  }

  private async requireDepartureByTour(
    tourId: bigint,
    departureCode: string,
  ): Promise<DepartureWithId> {
    const departure = await this.prisma.departure.findFirst({
      where: { tourId, code: departureCode },
      select: { ...DEPARTURE_SELECT, id: true },
    });
    if (!departure) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That departure was not found on this tour',
        errorCode: 'DEPARTURE_NOT_FOUND',
      });
    }
    return departure;
  }

  private async requireDeparture(
    agencyId: bigint,
    tourCode: string,
    departureCode: string,
  ): Promise<DepartureWithId> {
    const tour = await this.requireTour(agencyId, tourCode);
    return this.requireDepartureByTour(tour.id, departureCode);
  }
}