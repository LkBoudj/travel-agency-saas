import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SecurityModule } from '../security/security.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { PaymentsModule } from './payments.module.js';

/**
 * Agency payments over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models this domain's graph: the agency, its
 * bookings (only the columns the module resolves), the append-only payment
 * ledger and the audit log. The CHECK constraints, the append-only triggers and
 * the RESTRICT booking FK live in the migration and are verified against
 * PostgreSQL in the e2e spec; the interactive transaction + booking row lock is
 * modeled by running the callback against the same double under `$transaction`.
 */

type BookingRow = {
  id: bigint;
  code: string;
  agencyId: bigint;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  currency: string;
  totalAmount: Prisma.Decimal;
};

type PaymentRow = {
  id: bigint;
  code: string;
  bookingId: bigint;
  amount: Prisma.Decimal;
  currency: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  paidAt: Date;
  recordedByCode: string | null;
  createdAt: Date;
};

type RoleRow = {
  id: bigint;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  agencyId: bigint | null;
  permissionKeys: string[];
};

type UserRow = {
  id: bigint;
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  passwordHash: string;
};

type MembershipRow = {
  id: bigint;
  agencyId: bigint;
  appUserId: bigint;
  membershipType: string;
  status: string;
  createdAt: Date;
  roleIds: bigint[];
};

const NOW = new Date('2026-10-04T10:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const accountant = { id: 2n, code: 'USR-ACCOUNTANT01', email: 'accountant@mail.com' };
const clerk = { id: 3n, code: 'USR-CLERK00000001', email: 'clerk@mail.com' };

const ALL_PAYMENT_PERMISSIONS = ['AGENCY_PAYMENT_VIEW', 'AGENCY_PAYMENT_RECORD'] as const;

const DB = {
  bookings: [] as BookingRow[],
  payments: [] as PaymentRow[],
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  auditLog: [] as Array<{
    action: string;
    targetCode?: string;
    agencyCode?: string;
    metadata?: unknown;
  }>,
};

let nextId = 100n;
let nextCodeSeq = 1;
function id(): bigint {
  const value = nextId;
  nextId += 1n;
  return value;
}
function publicCode(prefix: string): string {
  const value = (nextCodeSeq++).toString(16).padStart(12, '0').toUpperCase();
  return `${prefix}-${value}`;
}

function addRole(
  key: string,
  scope: string,
  agencyId: bigint | null,
  permissionKeys: string[] = [],
  name = key,
): RoleRow {
  const row: RoleRow = {
    id: id(),
    key,
    name,
    description: `${name} description`,
    scope,
    agencyId,
    permissionKeys,
  };
  DB.roles.set(row.id, row);
  return row;
}

function addUser(seed: { id: bigint; code: string; email: string }, status = 'ACTIVE'): UserRow {
  const row: UserRow = {
    id: seed.id,
    code: seed.code,
    email: seed.email,
    firstName: 'First',
    lastName: 'Last',
    status,
    passwordHash: '$argon2id$seeded',
  };
  DB.users.set(row.id, row);
  return row;
}

function addMembership(
  agencyId: bigint,
  appUserId: bigint,
  roleIds: bigint[],
): MembershipRow {
  const row: MembershipRow = {
    id: id(),
    agencyId,
    appUserId,
    membershipType: 'USER',
    status: 'ACTIVE',
    createdAt: NOW,
    roleIds,
  };
  DB.memberships.push(row);
  return row;
}

function addBooking(
  agencyId: bigint,
  overrides: Partial<Omit<BookingRow, 'id' | 'code' | 'agencyId'>> = {},
): BookingRow {
  const row: BookingRow = {
    id: id(),
    code: publicCode('BKG'),
    agencyId,
    status: 'CONFIRMED',
    currency: 'DZD',
    totalAmount: new Prisma.Decimal(120000),
    ...overrides,
  };
  DB.bookings.push(row);
  return row;
}

function addPayment(
  bookingId: bigint,
  overrides: Partial<Omit<PaymentRow, 'id' | 'code' | 'bookingId'>> = {},
): PaymentRow {
  const row: PaymentRow = {
    id: id(),
    code: publicCode('PAY'),
    bookingId,
    amount: new Prisma.Decimal(50000),
    currency: 'DZD',
    method: null,
    reference: null,
    note: null,
    paidAt: NOW,
    recordedByCode: null,
    createdAt: NOW,
    ...overrides,
  };
  DB.payments.push(row);
  return row;
}

function projectPayment(row: PaymentRow) {
  return {
    code: row.code,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    reference: row.reference,
    note: row.note,
    paidAt: row.paidAt,
    recordedByCode: row.recordedByCode,
    createdAt: row.createdAt,
  };
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint; code?: string; email?: string } }) => {
      const user = [...DB.users.values()].find(
        (u) =>
          (where.id !== undefined && u.id === where.id) ||
          (where.code !== undefined && u.code === where.code) ||
          (where.email !== undefined && u.email === where.email),
      );
      return user ? { ...user } : null;
    }),
  },
  agency: {
    findUnique: vi.fn(
      async (args: {
        where: { code: string };
        select: { members: { where: { appUserId: bigint } } };
      }) => {
        const agency = [...DB.agencies.values()].find((a) => a.code === args.where.code);
        if (!agency) return null;
        const { appUserId } = args.select.members.where;
        const members = DB.memberships
          .filter((m) => m.agencyId === agency.id && m.appUserId === appUserId)
          .map((m) => ({
            id: m.id,
            membershipType: m.membershipType,
            status: m.status,
            agencyRoleAssignments: m.roleIds.map((roleId) => {
              const role = DB.roles.get(roleId)!;
              return {
                role: {
                  key: role.key,
                  name: role.name,
                  scope: role.scope,
                  agencyId: role.agencyId,
                  permissions: role.permissionKeys
                    .filter((k) => !k.startsWith('PLATFORM_'))
                    .map((k) => ({ permission: { key: k } })),
                },
              };
            }),
          }));
        return { ...agency, members };
      },
    ),
  },
  role: {
    findMany: vi.fn(async ({ where }: { where: { id: { in: bigint[] } } }) => {
      const rows = [];
      for (const roleId of where.id.in) {
        const row = DB.roles.get(roleId);
        if (row) rows.push(row);
      }
      return rows;
    }),
  },
  agencyMembership: {
    findMany: vi.fn(
      async ({
        where,
      }: {
        where: { agencyId?: bigint; appUserId?: bigint };
      }) => {
        let rows = [...DB.memberships];
        if (where.agencyId) rows = rows.filter((r) => r.agencyId === where.agencyId);
        if (where.appUserId) rows = rows.filter((r) => r.appUserId === where.appUserId);
        return rows;
      },
    ),
  },
  booking: {
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; code: string } }) => {
        const row = DB.bookings.find((b) => b.agencyId === where.agencyId && b.code === where.code);
        if (!row) return null;
        return {
          id: row.id,
          code: row.code,
          status: row.status,
          currency: row.currency,
          totalAmount: row.totalAmount,
        };
      },
    ),
  },
  payment: {
    findMany: vi.fn(
      async ({
        where,
        orderBy,
      }: {
        where: { bookingId: bigint };
        orderBy?: Array<{ paidAt?: 'desc'; id?: 'desc' }>;
      }) => {
        let rows = DB.payments.filter((p) => p.bookingId === where.bookingId);
        if (orderBy?.some((clause) => clause.paidAt === 'desc')) {
          rows = [...rows].sort(
            (a, b) => b.paidAt.getTime() - a.paidAt.getTime() || Number(b.id - a.id),
          );
        }
        return rows.map(projectPayment);
      },
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          code: string;
          bookingId: bigint;
          amount: Prisma.Decimal;
          currency: string;
          method: string | null;
          reference: string | null;
          note: string | null;
          paidAt: Date;
          recordedByCode: string | null;
        };
      }) => {
        const row: PaymentRow = {
          id: id(),
          code: data.code,
          bookingId: data.bookingId,
          amount: data.amount,
          currency: data.currency,
          method: data.method,
          reference: data.reference,
          note: data.note,
          paidAt: data.paidAt,
          recordedByCode: data.recordedByCode,
          createdAt: NOW,
        };
        DB.payments.push(row);
        return projectPayment(row);
      },
    ),
  },
  auditLog: {
    create: vi.fn(
      async ({
        data,
      }: {
        data: { action: string; targetCode?: string; agencyCode?: string; metadata?: unknown };
      }) => {
        DB.auditLog.push(data);
        return data;
      },
    ),
  },
  $queryRaw: vi.fn(async (_template: unknown, ...values: unknown[]) => {
    const bookingId = values[0] as bigint;
    const row = DB.bookings.find((b) => b.id === bookingId);
    if (!row) return [];
    return [
      {
        id: row.id,
        status: row.status,
        currency: row.currency,
        total_amount: row.totalAmount,
      },
    ];
  }),
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg !== 'function') return undefined;
    return arg(prismaMock);
  }),
};

function baseline(): void {
  DB.bookings = [];
  DB.payments = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextCodeSeq = 1;
}

function seedAgencies(): void {
  DB.agencies.set(SAHARA.id, SAHARA);
  DB.agencies.set(ATLAS.id, ATLAS);
  addUser(admin);
  addUser(accountant);
  addUser(clerk);
}

function seedOwner(): void {
  const ownerRole = addRole('AGENCY_OWNER', 'AGENCY', SAHARA.id, [...ALL_PAYMENT_PERMISSIONS]);
  addMembership(SAHARA.id, admin.id, [ownerRole.id]);
}

/** Can read the ledger but has no AGENCY_PAYMENT_RECORD. */
function seedAccountantWithoutRecord(): void {
  const viewOnly = addRole('AGENCY_VIEWER', 'AGENCY', SAHARA.id, ['AGENCY_PAYMENT_VIEW']);
  addMembership(SAHARA.id, accountant.id, [viewOnly.id]);
}

/** Holds neither AGENCY_PAYMENT_VIEW nor AGENCY_PAYMENT_RECORD. */
function seedClerkWithoutPayments(): void {
  const bookingOnly = addRole('AGENCY_COORDINATOR', 'AGENCY', SAHARA.id, [
    'AGENCY_BOOKING_VIEW',
  ]);
  addMembership(SAHARA.id, clerk.id, [bookingOnly.id]);
}

let app: INestApplication;
let adminToken: string;
let accountantToken: string;
let clerkToken: string;

const base = () => `/v1/agencies/${SAHARA.code}`;

function authHeader(token: string) {
  return { Cookie: `travel_access_token=${token}` };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          () => ({
            JWT_SECRET: 'test-secret',
            JWT_TTL: '1h',
            AUDIT_ENABLED: 'true',
          }),
        ],
      }),
      SecurityModule,
      AuthModule,
      AuthorizationModule,
      PaymentsModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  adminToken = app.get(JwtService).sign({ sub: admin.id.toString() });
  accountantToken = app.get(JwtService).sign({ sub: accountant.id.toString() });
  clerkToken = app.get(JwtService).sign({ sub: clerk.id.toString() });
});

beforeEach(() => {
  baseline();
  seedAgencies();
  seedOwner();
  seedAccountantWithoutRecord();
  seedClerkWithoutPayments();
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('if the caller is not authenticated', () => {
  it('401 on the payment endpoints', async () => {
    await request(app.getHttpServer()).get(`${base()}/bookings/BKG-1/payments`).expect(401);
    await request(app.getHttpServer())
      .post(`${base()}/bookings/BKG-1/payments`)
      .send({ amount: 1000 })
      .expect(401);
  });
});

describe('POST /v1/agencies/:agencyCode/bookings/:bookingCode/payments', () => {
  it('records a payment and returns the server-computed remaining (120000 − 50000 = 70000)', async () => {
    const booking = addBooking(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 50000, method: 'CASH', reference: '  RECEIPT-4471  ' })
      .expect(201);

    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].code).toMatch(/^PAY-[0-9A-F]{12}$/);
    expect(res.body.payments[0].amount).toBe(50000);
    // The currency comes from the booking, never from the client.
    expect(res.body.payments[0].currency).toBe('DZD');
    expect(res.body.payments[0].method).toBe('CASH');
    expect(res.body.payments[0].reference).toBe('RECEIPT-4471');
    expect(res.body.payments[0].recordedByCode).toBe(admin.code);
    expect(res.body.paidAmount).toBe(50000);
    expect(res.body.remainingAmount).toBe(70000);
    expect(res.body.totalAmount).toBe(120000);

    const audit = DB.auditLog.find((a) => a.action === 'AGENCY_PAYMENT_RECORDED');
    expect(audit?.targetCode).toBe(res.body.payments[0].code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
    expect(audit?.metadata).toEqual({
      bookingCode: booking.code,
      amount: 50000,
      currency: 'DZD',
      remainingAmount: 70000,
    });
  });

  it('accumulates several partial payments against one booking', async () => {
    const booking = addBooking(SAHARA.id);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 30000 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 20000 })
      .expect(201);

    expect(res.body.paidAmount).toBe(50000);
    expect(res.body.remainingAmount).toBe(70000);
    expect(res.body.payments).toHaveLength(2);
    expect(DB.payments).toHaveLength(2);
  });

  it('settles a booking exactly to zero remaining', async () => {
    const booking = addBooking(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 120000 })
      .expect(201);

    expect(res.body.paidAmount).toBe(120000);
    expect(res.body.remainingAmount).toBe(0);
  });

  it('sums fractional amounts exactly instead of drifting on floats', async () => {
    const booking = addBooking(SAHARA.id, {
      totalAmount: new Prisma.Decimal('0.30'),
    });

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 0.1 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 0.2 })
      .expect(201);

    expect(res.body.paidAmount).toBe(0.3);
    expect(res.body.remainingAmount).toBe(0);
  });

  it('400 on a zero, negative or sub-cent amount', async () => {
    const booking = addBooking(SAHARA.id);

    for (const amount of [0, -50000, 0.001]) {
      await request(app.getHttpServer())
        .post(`${base()}/bookings/${booking.code}/payments`)
        .set(authHeader(adminToken))
        .send({ amount })
        .expect(400);
    }

    expect(DB.payments).toHaveLength(0);
  });

  it('400 on an amount with more than 2 decimal places', async () => {
    const booking = addBooking(SAHARA.id);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 10.005 })
      .expect(400);

    expect(DB.payments).toHaveLength(0);
  });

  it('400 when the body smuggles a client-computed balance or currency', async () => {
    const booking = addBooking(SAHARA.id);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 1000, currency: 'EUR' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 1000, remainingAmount: 119000 })
      .expect(400);

    expect(DB.payments).toHaveLength(0);
  });

  it('400 on an unknown payment method', async () => {
    const booking = addBooking(SAHARA.id);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 1000, method: 'CRYPTO' })
      .expect(400);
  });

  it('409 when the payment would overpay the booking (PAYMENT_OVERPAYMENT)', async () => {
    const booking = addBooking(SAHARA.id);
    addPayment(booking.id, { amount: new Prisma.Decimal(50000) });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 200000 })
      .expect(409);

    expect(res.body.errorCode).toBe('PAYMENT_OVERPAYMENT');
    expect(res.body.remainingAmount).toBe(70000);
    expect(DB.payments).toHaveLength(1);
  });

  it('409 when the payment would exceed the remaining balance by a cent', async () => {
    const booking = addBooking(SAHARA.id, {
      totalAmount: new Prisma.Decimal('100.00'),
    });
    addPayment(booking.id, { amount: new Prisma.Decimal('99.99') });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 0.02 })
      .expect(409);

    expect(res.body.errorCode).toBe('PAYMENT_OVERPAYMENT');
    expect(res.body.remainingAmount).toBe(0.01);
  });

  it('409 on a booking that is already fully paid', async () => {
    const booking = addBooking(SAHARA.id);
    addPayment(booking.id, { amount: new Prisma.Decimal(120000) });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 1000 })
      .expect(409);

    expect(res.body.errorCode).toBe('PAYMENT_OVERPAYMENT');
    expect(res.body.remainingAmount).toBe(0);
  });

  it('409 when the booking has been cancelled (PAYMENT_BOOKING_CANCELLED)', async () => {
    const booking = addBooking(SAHARA.id, { status: 'CANCELLED' });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 1000 })
      .expect(409);

    expect(res.body.errorCode).toBe('PAYMENT_BOOKING_CANCELLED');
    expect(DB.payments).toHaveLength(0);
  });

  it('404 for a booking that belongs to another agency', async () => {
    const foreign = addBooking(ATLAS.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${foreign.code}/payments`)
      .set(authHeader(adminToken))
      .send({ amount: 1000 })
      .expect(404);

    expect(res.body.errorCode).toBe('BOOKING_NOT_FOUND');
    expect(DB.payments).toHaveLength(0);
  });

  it('403 without AGENCY_PAYMENT_RECORD', async () => {
    const booking = addBooking(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(accountantToken))
      .send({ amount: 1000 })
      .expect(403);

    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
    expect(DB.payments).toHaveLength(0);
  });
});

describe('GET /v1/agencies/:agencyCode/bookings/:bookingCode/payments', () => {
  it('lists the ledger newest-first with the derived balances', async () => {
    const booking = addBooking(SAHARA.id);
    addPayment(booking.id, {
      amount: new Prisma.Decimal(50000),
      paidAt: new Date('2026-10-01T09:00:00.000Z'),
    });
    addPayment(booking.id, {
      amount: new Prisma.Decimal(30000),
      paidAt: new Date('2026-10-03T09:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(res.body.bookingCode).toBe(booking.code);
    expect(res.body.currency).toBe('DZD');
    expect(res.body.totalAmount).toBe(120000);
    expect(res.body.paidAmount).toBe(80000);
    expect(res.body.remainingAmount).toBe(40000);
    expect(res.body.payments.map((p: { amount: number }) => p.amount)).toEqual([30000, 50000]);
  });

  it('returns a zeroed ledger for a booking that has never been paid', async () => {
    const booking = addBooking(SAHARA.id);

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(res.body.paidAmount).toBe(0);
    expect(res.body.remainingAmount).toBe(120000);
    expect(res.body.payments).toEqual([]);
  });

  it('reads a cancelled booking ledger read-only', async () => {
    const booking = addBooking(SAHARA.id, { status: 'CANCELLED' });

    await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(adminToken))
      .expect(200);
  });

  it('404 for a booking that belongs to another agency', async () => {
    const foreign = addBooking(ATLAS.id);

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/${foreign.code}/payments`)
      .set(authHeader(adminToken))
      .expect(404);

    expect(res.body.errorCode).toBe('BOOKING_NOT_FOUND');
  });

  it('403 without AGENCY_PAYMENT_VIEW', async () => {
    const booking = addBooking(SAHARA.id);

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(clerkToken))
      .expect(403);

    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('lets a view-only member read the ledger', async () => {
    const booking = addBooking(SAHARA.id);

    await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}/payments`)
      .set(authHeader(accountantToken))
      .expect(200);
  });
});