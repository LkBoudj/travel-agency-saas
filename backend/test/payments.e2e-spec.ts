import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { App } from 'supertest/types';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { AUTH_COOKIE_NAME } from '../src/auth/auth.constants.js';
import { AGENCY_ADMIN_SYSTEM_KEY } from '../src/rbac/rbac.constants.js';

const hex = () => randomBytes(6).toString('hex').toUpperCase();
const code = (prefix: string) => `${prefix}-${hex()}`;

const ACTOR = 'E2E-PAYMENTS';

/**
 * Removes every row this spec seeds, from both ends of the run.
 *
 * Teardown is the one legitimate exception to the ledger's append-only rule:
 * the payments table rejects UPDATE and DELETE through a trigger AND its
 * booking FK is RESTRICT, so a recorded payment can never be erased while its
 * booking exists — exactly the accounting-integrity property the module
 * asserts. That also means the agency cascade cannot complete on its own.
 *
 * So the guard is disabled only for the length of one transaction. PostgreSQL
 * DDL is transactional: if the delete throws, or the process dies mid-flight,
 * the whole transaction (including the DISABLE) rolls back and the trigger is
 * restored — the shared dev database is never left unguarded.
 */
async function purgeSeededRows(prisma: PrismaService): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const agencies = await tx.agency.findMany({
      where: { name: { startsWith: 'Payments' } },
      select: { id: true },
    });
    const bookingIds = (
      await tx.booking.findMany({
        where: { agencyId: { in: agencies.map((a) => a.id) } },
        select: { id: true },
      })
    ).map((b) => b.id);

    if (bookingIds.length > 0) {
      await tx.$executeRawUnsafe('ALTER TABLE payment DISABLE TRIGGER payment_append_only_delete');
      await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.$executeRawUnsafe('ALTER TABLE payment ENABLE TRIGGER payment_append_only_delete');
    }

    await tx.agency.deleteMany({
      where: { id: { in: agencies.map((a) => a.id) } },
    });
    await tx.appUser.deleteMany({
      where: { email: { startsWith: 'payments.' } },
    });
  });
}

/**
 * Real-PostgreSQL proof for Module K (manual payments, PRD §23).
 *
 * Authority (read byte-truth from the PRD, not the UI): an agency records
 * manual payments against a booking and the server is authoritative for the
 * remaining balance. PRD example arithmetic:
 *   120,000 DZD total  ->  50,000 DZD paid  ->  70,000 DZD remaining
 * There is NO external payment gateway in the MVP (roadmap future only).
 * Remaining is never fabricated on the client: it is computed server-side as
 * booking.totalAmount - SUM(payment amounts) and returned to the UI.
 *
 * This slice exercises the server-authoritative path end-to-end against the
 * LIVE database (Neon):
 *
 *   1. the happy path over HTTP: record a manual payment and assert the
 *      server-computed remaining (120,000 - 50,000 = 70,000 DZD);
 *   2. accumulation: several partial payments sum exactly, fractional amounts
 *      included, and a booking can settle to exactly zero remaining;
 *   3. overpayment: rejected at the API with PAYMENT_OVERPAYMENT, and the
 *      signed/no-guard path is 401;
 *   4. the ledger is APPEND-ONLY at the database: a direct UPDATE or DELETE on
 *      payment raises (trigger), so history cannot be rewritten even by raw SQL;
 *   5. integrity: a negative/zero amount is rejected by the amount CHECK and a
 *      booking's payments all inherit its currency;
 *   6. tenancy: a booking is only reachable through its OWN agency route;
 *   7. the ledger lock: concurrent payments on one booking cannot jointly
 *      overpay it — exactly the ones that fit are accepted.
 */
describe('PaymentsService + payment ledger (live PostgreSQL, PRD Section 23)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bookings: BookingsService;
  let payments: PaymentsService;
  let jwt: JwtService;
  let agencyId: bigint;
  let agencyCode: string;
  let ownerCookie: string;
  let customerCode: string;
  let tourId: bigint;
  let optionId: bigint;
  let optionCode: string;
  let provisionAgency: (name: string) => Promise<{ id: bigint; code: string }>;
  const departureCodes: string[] = [];
  const bookingCodes: string[] = [];

  const bookingFor = (seats = 1) => ({
    customerCode,
    departureCode: departureCodes[0],
    reservedSeats: seats,
    pricingSelections: [optionCode],
  });

  const newDeparture = async (capacity: number, amount: number | string = 10000) => {
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
        amount: new Prisma.Decimal(amount),
      },
    });
    departureCodes.push(departure.code);
    return departure;
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    bookings = app.get(BookingsService);
    payments = app.get(PaymentsService);
    jwt = app.get(JwtService);

    // Self-heal any rows left by a previously aborted run.
    await purgeSeededRows(prisma);

    const owner = await prisma.appUser.create({
      data: {
        code: code('USR'),
        email: `payments.${hex()}@test.local`.toLowerCase(),
        passwordHash: 'payments-test-only',
        firstName: 'Payments',
        lastName: 'Tester',
      },
      select: { id: true },
    });

    const ownerRoleId = await prisma.$transaction(async (tx) => {
      const existing = await tx.role.findFirst({
        where: { systemKey: AGENCY_ADMIN_SYSTEM_KEY, scope: 'AGENCY', agencyId: null },
        select: { id: true },
      });
      return (
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
                'Canonical global agency role (created by the live payments e2e when the RBAC seed is absent)',
            },
            select: { id: true },
          })
        ).id
      );
    });

    /**
     * Provisions an agency WITH its OWNER, because the database enforces the
     * ownership invariants (exactly one OWNER holding the AGENCY_ADMIN system
     * key) on every committed agency row — a bare `agency.create` is rejected.
     */
    provisionAgency = async (name: string) =>
      prisma.$transaction(async (tx) => {
        const agency = await tx.agency.create({
          data: { code: code('AGY'), name },
          select: { id: true, code: true },
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
          data: { membershipId: membership.id, roleId: ownerRoleId },
        });
        return agency;
      });

    const agency = await provisionAgency(`Payments Agency ${hex()}`);
    agencyId = agency.id;
    agencyCode = agency.code;
    ownerCookie = `${AUTH_COOKIE_NAME}=${await jwt.signAsync({ sub: String(owner.id) })}`;

    const customer = await prisma.customer.create({
      data: {
        code: code('CUS'),
        agencyId,
        firstName: 'Live',
        lastName: 'Payer',
        status: 'ACTIVE',
      },
      select: { code: true },
    });
    customerCode = customer.code;

    const tour = await prisma.tour.create({
      data: {
        code: code('TUR'),
        agencyId,
        name: `Payments Tour ${hex()}`,
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
        name: `Payments Option ${hex()}`,
        basis: 'per_person',
      },
      select: { id: true, code: true },
    });
    optionId = option.id;
    optionCode = option.code;

    await newDeparture(20, 120000);
  });

  afterAll(async () => {
    await purgeSeededRows(prisma);
    await app.close();
  });

  const base = () => `/v1/agencies/${agencyCode}`;

  const createBooking = async () => {
    const booking = await bookings.create(agencyId, bookingFor(1), ACTOR);
    bookingCodes.push(booking.code);
    return booking;
  };

  describe('recording a manual payment over HTTP (server-authoritative remaining)', () => {
    it('records a payment and returns the server-computed remaining (120000 - 50000 = 70000 DZD)', async () => {
      const booking = await createBooking();
      expect(booking.totalAmount).toBe(120000);

      const res = await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 50000, method: 'CASH', reference: 'RECEIPT-4471' })
        .expect(201);

      expect(res.body.currency).toBe('DZD');
      expect(res.body.totalAmount).toBe(120000);
      expect(res.body.paidAmount).toBe(50000);
      expect(res.body.remainingAmount).toBe(70000);
      expect(res.body.payments).toHaveLength(1);
      expect(res.body.payments[0].code).toMatch(/^PAY-/);
      expect(res.body.payments[0].amount).toBe(50000);
      expect(res.body.payments[0].currency).toBe('DZD');
      expect(res.body.payments[0].method).toBe('CASH');
      expect(res.body.payments[0].reference).toBe('RECEIPT-4471');

      // The persisted row matches what the API reported.
      const stored = await prisma.payment.findFirstOrThrow({
        where: { bookingId: (await prisma.booking.findFirstOrThrow({
          where: { code: booking.code },
          select: { id: true },
        })).id },
      });
      expect(stored.code).toBe(res.body.payments[0].code);
      expect(stored.amount.toNumber()).toBe(50000);
      expect(stored.currency).toBe('DZD');
    });

    it('accumulates several partial payments and settles exactly to zero', async () => {
      const booking = await createBooking();

      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 50000 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 70000 })
        .expect(201);

      expect(res.body.paidAmount).toBe(120000);
      expect(res.body.remainingAmount).toBe(0);
      expect(res.body.payments).toHaveLength(2);
    });

    it('rejects a payment that would make remaining negative (over-payment)', async () => {
      const booking = await createBooking();

      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 50000 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 200000 })
        .expect(409);

      expect(res.body.errorCode).toBe('PAYMENT_OVERPAYMENT');
      expect(res.body.remainingAmount).toBe(70000);
    });

    it('401 on a payment without the auth cookie', async () => {
      const booking = await createBooking();

      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .send({ amount: 1000 })
        .expect(401);
    });
  });

  describe('Payment ledger integrity', () => {
    it('rejects a negative or zero amount at the database CHECK', async () => {
      const booking = await createBooking();

      await expect(
        prisma.payment.create({
          data: {
            code: code('PAY'),
            bookingId: (await prisma.booking.findFirstOrThrow({
              where: { code: booking.code },
              select: { id: true },
            })).id,
            amount: new Prisma.Decimal(-1),
            currency: 'DZD',
          },
        }),
      ).rejects.toThrow();

      await expect(
        prisma.payment.create({
          data: {
            code: code('PAY'),
            bookingId: (await prisma.booking.findFirstOrThrow({
              where: { code: booking.code },
              select: { id: true },
            })).id,
            amount: new Prisma.Decimal(0),
            currency: 'DZD',
          },
        }),
      ).rejects.toThrow();
    });

    it('the ledger is append-only at the database (UPDATE and DELETE are rejected)', async () => {
      const booking = await createBooking();

      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 1000 })
        .expect(201);

      const row = await prisma.payment.findFirstOrThrow({
        where: { bookingId: (await prisma.booking.findFirstOrThrow({
          where: { code: booking.code },
          select: { id: true },
        })).id },
      });

      // Even raw SQL cannot rewrite or erase a recorded payment.
      await expect(
        prisma.$executeRawUnsafe(
          'UPDATE payment SET amount = 999999 WHERE id = ' + row.id.toString(),
        ),
      ).rejects.toThrow();

      await expect(
        prisma.$executeRawUnsafe('DELETE FROM payment WHERE id = ' + row.id.toString()),
      ).rejects.toThrow();

      // The row is still exactly as it was recorded.
      const still = await prisma.payment.findFirstOrThrow({ where: { id: row.id } });
      expect(still.amount.toNumber()).toBe(1000);
    });

    it('sums fractional amounts exactly instead of drifting on floats', async () => {
      // A 0.30 DZD total with two fractional payments proves the money
      // arithmetic runs in integer minor units (0.1 + 0.2 === 0.3, not
      // 0.30000000000000004).
      await newDeparture(20, '0.30');
      const departureCode = departureCodes[departureCodes.length - 1];
      const booking = await bookings.create(
        agencyId,
        {
          customerCode,
          departureCode,
          reservedSeats: 1,
          pricingSelections: [optionCode],
        },
        ACTOR,
      );
      bookingCodes.push(booking.code);
      expect(booking.totalAmount).toBe(0.3);

      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 0.1 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 0.2 })
        .expect(201);

      expect(res.body.paidAmount).toBe(0.3);
      expect(res.body.remainingAmount).toBe(0);
    });

    it('records payment history for a booking and denies cross-tenant reads', async () => {
      const booking = await createBooking();
      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 50000 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .expect(200);
      expect(res.body.payments).toHaveLength(1);

      // The caller is an OWNER of a SECOND agency, so membership is not what
      // stops this: agency A's own booking must simply not exist for agency B's
      // route. That isolates booking tenancy from the membership guard.
      const other = await provisionAgency(`Payments Other ${hex()}`);

      const denied = await request(app.getHttpServer())
        .get(`/v1/agencies/${other.code}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .expect(404);
      expect(denied.body.errorCode).toBe('BOOKING_NOT_FOUND');

      // …and the write path is equally blind to it.
      const refused = await request(app.getHttpServer())
        .post(`/v1/agencies/${other.code}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 1000 })
        .expect(404);
      expect(refused.body.errorCode).toBe('BOOKING_NOT_FOUND');
    });
  });

  describe('concurrency and cancellation', () => {
    it('a burst of concurrent payments on one booking cannot jointly overpay it', async () => {
      const booking = await createBooking();
      const bookingRow = await prisma.booking.findFirstOrThrow({
        where: { code: booking.code },
        select: { id: true },
      });

      // 4 x 50,000 against a 120,000 total: the booking can absorb only two.
      type RecordResult = Awaited<ReturnType<typeof payments.record>>;
      const results = await Promise.allSettled<RecordResult>(
        Array.from({ length: 4 }, () =>
          payments.record(agencyId, booking.code, { amount: 50000 }, ACTOR),
        ),
      );
      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<RecordResult> => r.status === 'fulfilled',
      );
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(2);
      expect(rejected).toHaveLength(2);
      for (const r of rejected) {
        expect(r.reason).toBeInstanceOf(ConflictException);
        expect((r.reason as ConflictException).getResponse()).toMatchObject({
          errorCode: 'PAYMENT_OVERPAYMENT',
        });
      }

      // The persisted ledger sums to exactly the booking total, never above.
      const total = await prisma.payment.aggregate({
        where: { bookingId: bookingRow.id },
        _sum: { amount: true },
      });
      expect(total._sum.amount?.toNumber()).toBe(100000);
    });

    it('409 on a cancelled booking (PAYMENT_BOOKING_CANCELLED)', async () => {
      const booking = await createBooking();
      await bookings.cancel(agencyId, booking.code, { reason: 'e2e' }, ACTOR);

      const res = await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set('Cookie', ownerCookie)
        .send({ amount: 1000 })
        .expect(409);

      expect(res.body.errorCode).toBe('PAYMENT_BOOKING_CANCELLED');
    });
  });
});