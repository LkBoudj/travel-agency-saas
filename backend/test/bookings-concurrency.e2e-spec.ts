import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ConflictException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { App } from 'supertest/types';
import { Prisma } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';
import { BOOKING_ACTIVE_STATUSES } from '../src/bookings/bookings.types.js';
import { AGENCY_ADMIN_SYSTEM_KEY } from '../src/rbac/rbac.constants.js';
import type {
  CancelBookingBody,
  CreateBookingBody,
} from '../src/bookings/bookings.schemas.js';

const NEW_BOOKING_TIMEOUT = 120_000;

const hex = () => randomBytes(6).toString('hex').toUpperCase();
const code = (prefix: string) => `${prefix}-${hex()}`;

const ACTOR = 'E2E-CONCURRENCY';

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
 * Real-PostgreSQL concurrency proof for the Module I capacity model.
 *
 * `bookings.service.ts` consumes/releases seats only inside an interactive
 * transaction that first re-reads the departure row with `SELECT ... FOR
 * UPDATE`. These tests run that code against the LIVE database (Neon) with
 * genuinely concurrent operations, not mocks, and assert the effects on the
 * committed rows:
 *
 *   1. two concurrent bookings racing for the last seat — exactly one wins;
 *   2. concurrent cancellation + booking on a full departure — accounting never
 *      breaks, whichever transaction grabs the row lock first;
 *   3. a concurrent burst (= capacity seats) — every booking lands exactly once
 *      (all-or-nothing seat allocation, no lost updates);
 *   4. a burst of one more than capacity — exactly `capacity` succeed and the
 *      overflow is rejected, proving the row lock (and not optimistic luck)
 *      protects the ledger in reality.
 */
describe('BookingsService concurrency (live PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let service: BookingsService;
  let agencyId: bigint;
  let appUserId: bigint;
  let customerCode: string;
  let tourId: bigint;
  let optionId: bigint;
  let optionCode: string;
  const departureCodes: string[] = [];

  const activeSeats = async (departureId: bigint): Promise<number> => {
    const aggregate = await prisma.booking.aggregate({
      where: { departureId, status: { in: [...BOOKING_ACTIVE_STATUSES] } },
      _sum: { reservedSeats: true },
    });
    return aggregate._sum.reservedSeats ?? 0;
  };

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
      service = app.get(BookingsService);

      // Self-heal any rows left by a previously aborted run (e.g. vitest killed
      // before `afterAll`), so the suite stays re-runnable. Random per-run codes
      // never collide otherwise; this only removes ever-orphaned graphs.
      await prisma.agency.deleteMany({
        where: { name: { startsWith: 'Concurrency' } },
      });
      await prisma.appUser.deleteMany({
        where: { email: { startsWith: 'concurrency.' } },
      });

      // Identity that owns the seeded agency (the seat race is not about auth).
      const owner = await prisma.appUser.create({
        data: {
          code: code('USR'),
          email: `concurrency.${hex()}@test.local`.toLowerCase(),
          passwordHash: 'concurrency-test-only',
          firstName: 'Concurrency',
          lastName: 'Tester',
        },
        select: { id: true },
      });
      appUserId = owner.id;

      // A valid agency must satisfy the deferred ownership invariants at COMMIT:
      // exactly one ACTIVE OWNER holding the canonical AGENCY_ADMIN system role.
      // The canonical role comes from the RBAC seed when present; otherwise this
      // test creates the exact row the seed would create (it is never deleted —
      // protected system identity).
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
                  'Canonical global agency role (created by the live concurrency e2e when the RBAC seed is absent)',
              },
              select: { id: true },
            })
          ).id;

        const agency = await tx.agency.create({
          data: { code: code('AGY'), name: `Concurrency Agency ${hex()}` },
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
          name: `Concurrency Tour ${hex()}`,
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
          name: `Concurrency Option ${hex()}`,
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
    'two concurrent bookings racing for the last seat: exactly one succeeds',
    async () => {
      const dep = await newDeparture(1);

      const results = await Promise.allSettled([
        service.create(agencyId, bookingFor(dep.code), ACTOR),
        service.create(agencyId, bookingFor(dep.code), ACTOR),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expectConflictError(rejected[0].reason, 'BOOKING_CAPACITY_EXCEEDED');

      // The loser wrote nothing: one booking row, ledger exactly the capacity.
      const count = await prisma.booking.count({ where: { departureId: dep.id } });
      expect(count).toBe(1);
      const ledger = await activeSeats(dep.id);
      expect(ledger).toBe(1);
      expect(ledger).toBeLessThanOrEqual(1);
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'concurrent cancellation + booking never corrupts the seat ledger (capacity 1, 3 rounds)',
    async () => {
      const rounds = 3;
      for (let round = 0; round < rounds; round++) {
        const dep = await newDeparture(1);
        const first = await service.create(agencyId, bookingFor(dep.code), ACTOR);
        expect(first.status).toBe('PENDING');

        const settle = await Promise.allSettled([
          service.cancel(agencyId, first.code, { reason: 'released' } as CancelBookingBody, ACTOR),
          service.create(agencyId, bookingFor(dep.code), ACTOR),
        ]);

        // Whichever transaction wins the departure row lock, A must end cancelled
        // and the active ledger must be exactly 0 or 1 — never 2, never negative.
        const aStatus = await prisma.booking.findUniqueOrThrow({
          where: { code: first.code },
          select: { status: true },
        });
        expect(aStatus.status).toBe('CANCELLED');

        const createdB = settle[1].status === 'fulfilled';
        const cancelled = settle[0].status === 'fulfilled';
        expect(cancelled).toBe(true);

        const ledger = await activeSeats(dep.id);
        expect(ledger).toBe(createdB ? 1 : 0);
        expect(ledger).toBeLessThanOrEqual(1);

        if (!createdB) {
          expectConflictError(settle[1].reason, 'BOOKING_CAPACITY_EXCEEDED');
          // The cancelled seat is really released: a fresh booking now lands.
          const retry = await service.create(agencyId, bookingFor(dep.code), ACTOR);
          expect(retry.status).toBe('PENDING');
        } else {
          // The concurrent booking consumed the seat the cancellation freed.
          expect(await prisma.booking.count({ where: { departureId: dep.id } })).toBe(2);
        }
      }
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'a burst of exactly capacity concurrent bookings all land with no lost updates (20/20)',
    async () => {
      const capacity = 20;
      const dep = await newDeparture(capacity);

      const results = await Promise.allSettled(
        Array.from({ length: capacity }, () =>
          service.create(agencyId, bookingFor(dep.code), ACTOR),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(capacity);
      expect(results.some((r) => r.status === 'rejected')).toBe(false);

      const ledger = await activeSeats(dep.id);
      expect(ledger).toBe(capacity);
      expect(
        await prisma.booking.count({ where: { departureId: dep.id } }),
      ).toBe(capacity);
    },
    NEW_BOOKING_TIMEOUT,
  );

  it(
    'a burst of capacity+1 concurrent bookings: exactly capacity succeed, overflow is rejected (20/21)',
    async () => {
      const capacity = 20;
      const dep = await newDeparture(capacity);

      const results = await Promise.allSettled(
        Array.from({ length: capacity + 1 }, () =>
          service.create(agencyId, bookingFor(dep.code), ACTOR),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(capacity);
      expect(rejected).toHaveLength(1);
      expectConflictError(rejected[0].reason, 'BOOKING_CAPACITY_EXCEEDED');

      const ledger = await activeSeats(dep.id);
      expect(ledger).toBe(capacity);
      expect(
        await prisma.booking.count({ where: { departureId: dep.id } }),
      ).toBe(capacity);
    },
    NEW_BOOKING_TIMEOUT,
  );

  afterAll(
    async () => {
      // Everything booked/created below hangs off the agency (FK cascades), so
      // a single delete leaves no leftovers; the OWNER user is cleaned up last.
      await prisma.agency.delete({ where: { id: agencyId } });
      await prisma.appUser.delete({ where: { id: appUserId } });
      await app.close();
    },
    60_000,
  );
});