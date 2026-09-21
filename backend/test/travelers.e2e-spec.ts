import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ConflictException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { App } from 'supertest/types';
import { Prisma } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';
import { TravelersService } from '../src/travelers/travelers.service.js';
import { AGENCY_ADMIN_SYSTEM_KEY } from '../src/rbac/rbac.constants.js';
import type { CreateBookingBody } from '../src/bookings/bookings.schemas.js';

const NEW_BOOKING_TIMEOUT = 120_000;

const hex = () => randomBytes(6).toString('hex').toUpperCase();
const code = (prefix: string) => `${prefix}-${hex()}`;

const ACTOR = 'E2E-TRAVELERS';

interface SeededDeparture {
  id: bigint;
  code: string;
}

function expectConflictError(exc: unknown, errorCode: string) {
  expect(exc).toBeInstanceOf(ConflictException);
  const body = (exc as ConflictException).getResponse() as {
    statusCode: number;
    message: string;
    errorCode: string;
  };
  expect(body.statusCode).toBe(409);
  expect(body.errorCode).toBe(errorCode);
}

/**
 * Real-PostgreSQL travel-module proof for Module J (traveler manifest) and the
 * Module I readiness-gated confirmation it enables. Runs against the LIVE
 * database (Neon):
 *
 *   1. the happy path: travelers fill the manifest exactly and confirm freezes
 *      it (status + confirmedAt + status history row, audited actor);
 *   2. the gate: confirmation is rejected with the exact expected/actual counts
 *      while the manifest is out of sync;
 *   3. the freeze, twice-guarded: after confirmation the service rejects
 *      further writes (BOOKING_TRAVELERS_FROZEN) AND a direct INSERT/UPDATE/DELETE
 *      on booking_traveler raises at the database (trigger), so the rule is not
 *      reducible to the application layer;
 *   4. the manifest cap: adds beyond the immutable reservedSeats are rejected;
 *   5. tenancy: a traveler always resolves only through its own agency;
 *   6. the manifest lock: a burst of capacity+1 concurrent adds on one booking
 *      lets exactly reservedSeats through and rejects the overflow;
 *   7. the confirm/add race on the booking-row lock: the manifest and the
 *      confirmed status always end consistent.
 */
describe('TravelersService + confirm gate (live PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let service: TravelersService;
  let bookings: BookingsService;
  let agencyId: bigint;
  let appUserId: bigint;
  let customerCode: string;
  let tourId: bigint;
  let optionId: bigint;
  let optionCode: string;
  const departureCodes: string[] = [];

  const bookingFor = (departureCode: string, seats = 1): CreateBookingBody => ({
    customerCode,
    departureCode,
    reservedSeats: seats,
    pricingSelections: [optionCode],
  });

  const newDeparture = async (capacity: number): Promise<SeededDeparture> => {
    const now = Date.now();
    const departure = await prisma.departure.create({
      data: {
        code: code('DEP'),
        tourId,
        status: 'OPEN',
        startAt: new Date(now + 86_400_000 * 30),
        endAt: new Date(now + 86_400_000 * 35),
        capacity,
      },
      select: { id: true, code: true },
    });
    await prisma.departurePrice.create({
      data: {
        departureId: departure.id,
        pricingOptionId: optionId,
        amount: new Prisma.Decimal(10000),
      },
    });
    departureCodes.push(departure.code);
    return departure;
  };

  beforeAll(
    async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
      configureApp(app);
      await app.init();
      prisma = app.get(PrismaService);
      service = app.get(TravelersService);
      bookings = app.get(BookingsService);

      // Self-heal any rows left by a previously aborted run.
      await prisma.agency.deleteMany({
        where: { name: { startsWith: 'Travelers' } },
      });
      await prisma.appUser.deleteMany({
        where: { email: { startsWith: 'travelers.' } },
      });

      const owner = await prisma.appUser.create({
        data: {
          code: code('USR'),
          email: `travelers.${hex()}@test.local`.toLowerCase(),
          passwordHash: 'travelers-test-only',
          firstName: 'Travelers',
          lastName: 'Tester',
        },
        select: { id: true },
      });
      appUserId = owner.id;

      agencyId = await prisma.$transaction(async (tx) => {
        const existing = await tx.role.findFirst({
          where: { systemKey: AGENCY_ADMIN_SYSTEM_KEY, scope: 'AGENCY', agencyId: null },
          select: { id: true },
        });
        const roleId =
          existing?.id ??
          (
            await tx.role.create({
              data: {
                key: 'AGENCY_OWNER',
                name: 'Agency Owner',
                scope: 'AGENCY',
                agencyId: null,
                systemKey: AGENCY_ADMIN_SYSTEM_KEY,
                description:
                  'Canonical global agency role (created by the live travelers e2e when the RBAC seed is absent)',
              },
              select: { id: true },
            })
          ).id;

        const agency = await tx.agency.create({
          data: { code: code('AGY'), name: `Travelers Agency ${hex()}` },
          select: { id: true },
        });
        const membership = await tx.agencyMembership.create({
          data: {
            agencyId: agency.id,
            appUserId: owner.id,
            membershipType: 'OWNER',
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        await tx.agencyRoleAssignment.create({
          data: { membershipId: membership.id, roleId },
        });
        return agency.id;
      });

      const customer = await prisma.customer.create({
        data: {
          code: code('CUS'),
          agencyId,
          firstName: 'Live',
          lastName: 'Tester',
          status: 'ACTIVE',
        },
        select: { code: true },
      });
      customerCode = customer.code;

      const tour = await prisma.tour.create({
        data: {
          code: code('TUR'),
          agencyId,
          name: `Travelers Tour ${hex()}`,
          status: 'PUBLISHED',
          format: 'experience',
          geographicScope: 'domestic',
          availabilityMode: 'scheduled',
        },
        select: { id: true },
      });
      tourId = tour.id;

      const option = await prisma.pricingOption.create({
        data: {
          code: code('PRC'),
          tourId,
          name: `Travelers Option ${hex()}`,
          basis: 'per_person',
        },
        select: { id: true, code: true },
      });
      optionId = option.id;
      optionCode = option.code;
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'a booking with a complete traveler manifest can be confirmed',
    async () => {
      const dep = await newDeparture(2);
      const booking = await bookings.create(agencyId, bookingFor(dep.code, 2), ACTOR);

      const first = await service.add(agencyId, booking.code, {
        firstName: 'Amel',
        lastName: 'Benali',
        email: 'amel@example.com',
      });
      const second = await service.add(agencyId, booking.code, {
        firstName: 'Sara',
        lastName: 'Haddad',
      });

      expect(first.code).toMatch(/^TRV-[0-9A-F]{12}$/);
      expect(first.email).toBe('amel@example.com');
      expect(second.code).toMatch(/^TRV-[0-9A-F]{12}$/);

      const listed = await service.list(agencyId, booking.code);
      expect(listed.map((t) => t.code)).toEqual([first.code, second.code]);

      const confirmed = await bookings.confirm(agencyId, booking.code, ACTOR);
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.confirmedAt).toBeTruthy();

      const history = await prisma.bookingStatusHistory.findFirst({
        where: { bookingId: (await prisma.booking.findUniqueOrThrow({ where: { code: booking.code }, select: { id: true } })).id, toStatus: 'CONFIRMED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(history?.fromStatus).toBe('PENDING');
      expect(history?.actorCode).toBe(ACTOR);
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'confirmation is rejected while the manifest is out of sync',
    async () => {
      const dep = await newDeparture(2);
      const booking = await bookings.create(agencyId, bookingFor(dep.code, 2), ACTOR);
      await service.add(agencyId, booking.code, { firstName: 'Amel', lastName: 'Benali' });

      try {
        await bookings.confirm(agencyId, booking.code, ACTOR);
        throw new Error('expected confirmation to be rejected');
      } catch (exc) {
        expectConflictError(exc, 'BOOKING_TRAVELER_COUNT_MISMATCH');
        const body = (exc as ConflictException).getResponse() as Record<string, unknown>;
        expect(body.expected).toBe(2);
        expect(body.actual).toBe(1);
      }

      const status = await prisma.booking.findUniqueOrThrow({
        where: { code: booking.code },
        select: { status: true },
      });
      expect(status.status).toBe('PENDING');
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'writes are frozen after confirmation by the service AND by the database trigger',
    async () => {
      const dep = await newDeparture(2);
      const booking = await bookings.create(agencyId, bookingFor(dep.code, 2), ACTOR);
      const first = await service.add(agencyId, booking.code, { firstName: 'Amel', lastName: 'Benali' });
      const second = await service.add(agencyId, booking.code, { firstName: 'Sara', lastName: 'Haddad' });
      await bookings.confirm(agencyId, booking.code, ACTOR);

      // Service layer refuses further writes.
      try {
        await service.add(agencyId, booking.code, { firstName: 'Ghost', lastName: 'Rider' });
        throw new Error('expected add to be frozen');
      } catch (exc) {
        expectConflictError(exc, 'BOOKING_TRAVELERS_FROZEN');
      }
      try {
        await service.update(agencyId, booking.code, first.code, { firstName: 'Ghost' });
        throw new Error('expected update to be frozen');
      } catch (exc) {
        expectConflictError(exc, 'BOOKING_TRAVELERS_FROZEN');
      }

      const row = await prisma.booking.findUniqueOrThrow({
        where: { code: booking.code },
        select: { id: true },
      });
      const travelerId = (
        await prisma.bookingTraveler.findUniqueOrThrow({
          where: { code: first.code },
          select: { id: true },
        })
      ).id;

      // The database trigger set makes the freeze unconditional:
      // direct writes bypassing the service are still rejected.
      await expect(
        prisma.bookingTraveler.create({
          data: {
            code: code('TRV'),
            bookingId: row.id,
            firstName: 'Ghost',
            lastName: 'Rider',
          },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.bookingTraveler.update({ where: { id: travelerId }, data: { firstName: 'Ghost' } }),
      ).rejects.toThrow();
      await expect(
        prisma.bookingTraveler.delete({ where: { id: travelerId } }),
      ).rejects.toThrow();

      // The manifest is intact.
      expect(await prisma.bookingTraveler.count({ where: { bookingId: row.id } })).toBe(2);
      void second;
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'adding beyond the immutable reservedSeats is rejected',
    async () => {
      const dep = await newDeparture(1);
      const booking = await bookings.create(agencyId, bookingFor(dep.code, 1), ACTOR);
      await service.add(agencyId, booking.code, { firstName: 'Amel', lastName: 'Benali' });

      try {
        await service.add(agencyId, booking.code, { firstName: 'Sara', lastName: 'Haddad' });
        throw new Error('expected the manifest cap to reject the add');
      } catch (exc) {
        expectConflictError(exc, 'BOOKING_TRAVELER_LIMIT_REACHED');
        const body = (exc as ConflictException).getResponse() as Record<string, unknown>;
        expect(body.expected).toBe(1);
        expect(body.actual).toBe(1);
      }
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'a traveler always resolves through its own agency only',
    async () => {
      const dep = await newDeparture(1);
      const booking = await bookings.create(agencyId, bookingFor(dep.code, 1), ACTOR);

      const otherAgencyId = await prisma.$transaction(async (tx) => {
        const existing = await tx.role.findFirst({
          where: { systemKey: AGENCY_ADMIN_SYSTEM_KEY, scope: 'AGENCY', agencyId: null },
          select: { id: true },
        });
        const roleId = existing!.id;
        const other = await tx.agency.create({
          data: { code: code('AGY'), name: `Foreign Agency ${hex()}` },
          select: { id: true },
        });
        const membership = await tx.agencyMembership.create({
          data: {
            agencyId: other.id,
            appUserId,
            membershipType: 'OWNER',
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        await tx.agencyRoleAssignment.create({ data: { membershipId: membership.id, roleId } });
        return other.id;
      });

      try {
        await service.add(otherAgencyId, booking.code, { firstName: 'Amel', lastName: 'Benali' });
        throw new Error('expected a foreign agency to be refused');
      } catch (exc) {
        expect((exc as { getResponse?: () => unknown })?.getResponse?.() as { errorCode?: string })
          .toMatchObject({ errorCode: 'BOOKING_NOT_FOUND' });
      } finally {
        await prisma.agency.delete({ where: { id: otherAgencyId } });
      }
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'a burst of reservedSeats+1 concurrent adds on one booking: exactly capacity land (20/21)',
    async () => {
      const seats = 20;
      const dep = await newDeparture(20);
      const booking = await bookings.create(agencyId, bookingFor(dep.code, seats), ACTOR);

      const results = await Promise.allSettled(
        Array.from({ length: seats + 1 }, (_, index) =>
          service.add(agencyId, booking.code, {
            firstName: `Passenger ${index}`,
            lastName: 'Seat',
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(seats);
      expect(rejected).toHaveLength(1);
      expectConflictError(rejected[0].reason, 'BOOKING_TRAVELER_LIMIT_REACHED');

      const row = await prisma.booking.findUniqueOrThrow({
        where: { code: booking.code },
        select: { id: true },
      });
      expect(await prisma.bookingTraveler.count({ where: { bookingId: row.id } })).toBe(seats);
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'a confirm racing a missing traveler can never confirm an incomplete manifest',
    async () => {
      for (let round = 0; round < 3; round++) {
        const dep = await newDeparture(1);
        const booking = await bookings.create(agencyId, bookingFor(dep.code, 1), ACTOR);

        const settle = await Promise.allSettled([
          bookings.confirm(agencyId, booking.code, ACTOR),
          service.add(agencyId, booking.code, { firstName: 'Sara', lastName: 'Haddad' }),
        ]);

        const confirmFulfilled = settle[0].status === 'fulfilled';
        const addFulfilled = settle[1].status === 'fulfilled';

        // The add only loses if confirm won the lock first — but a confirm
        // cannot succeed on an empty manifest, so the add always lands.
        expect(addFulfilled).toBe(true);

        const row = await prisma.booking.findUniqueOrThrow({
          where: { code: booking.code },
          select: { id: true, status: true },
        });
        const travelerCount = await prisma.bookingTraveler.count({
          where: { bookingId: row.id },
        });

        // Whatever the interleaving, confirm never fires on an incomplete
        // manifest: if it succeeded the booking is CONFIRMED with exactly one
        // traveler; if it lost, the booking stays PENDING.
        expect(travelerCount).toBe(1);
        if (confirmFulfilled) {
          expect(row.status).toBe('CONFIRMED');
        } else {
          expect(row.status).toBe('PENDING');
        }
      }
    },
    NEW_BOOKING_TIMEOUT,
  );

  afterAll(
    async () => {
      // Everything hangs off the agencies (FK cascades exercise the delete
      // trigger's cascade guard); the OWNER user is cleaned up last.
      await prisma.agency.deleteMany({
        where: { name: { startsWith: 'Travelers' } },
      });
      await prisma.appUser.delete({ where: { id: appUserId } });
      await app.close();
    },
    60_000,
  );
});