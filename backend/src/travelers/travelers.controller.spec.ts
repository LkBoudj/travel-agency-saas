import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SecurityModule } from '../security/security.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { TravelersModule } from './travelers.module.js';

/**
 * Agency travelers over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models this domain's graph: the agency, its
 * bookings (only the columns the module resolves), the traveler rows of a
 * booking, and the audit log. The CHECK constraints (names/optional-text) and
 * the PENDING-only freeze live in the migration and are verified against
 * PostgreSQL there, not here; the interactive transaction + row lock is modeled
 * by running the callback against the same double under `$transaction`.
 */

type BookingRow = {
  id: bigint;
  code: string;
  agencyId: bigint;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  reservedSeats: number;
};

type TravelerRow = {
  id: bigint;
  code: string;
  bookingId: bigint;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
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

const NOW = new Date('2026-09-20T10:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };

const ALL_TRAVELER_PERMISSIONS = [
  'AGENCY_TRAVELER_VIEW',
  'AGENCY_TRAVELER_CREATE',
  'AGENCY_TRAVELER_UPDATE',
] as const;

const DB = {
  bookings: [] as BookingRow[],
  travelers: [] as TravelerRow[],
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
    status: 'PENDING',
    reservedSeats: 2,
    ...overrides,
  };
  DB.bookings.push(row);
  return row;
}

function addTraveler(
  bookingId: bigint,
  overrides: Partial<TravelerRow> = {},
): TravelerRow {
  const row: TravelerRow = {
    id: id(),
    code: publicCode('TRV'),
    bookingId,
    firstName: 'Amel',
    lastName: 'Benali',
    email: null,
    phone: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.travelers.push(row);
  return row;
}

function projectTraveler(row: TravelerRow) {
  return {
    code: row.code,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
      for (const { id: roleId } of where.id.in) {
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
        const row = DB.bookings.find(
          (b) => b.agencyId === where.agencyId && b.code === where.code,
        );
        if (!row) return null;
        return {
          id: row.id,
          code: row.code,
          status: row.status,
          reservedSeats: row.reservedSeats,
        };
      },
    ),
  },
  bookingTraveler: {
    count: vi.fn(
      async ({ where }: { where: { bookingId: bigint } }) =>
        DB.travelers.filter((t) => t.bookingId === where.bookingId).length,
    ),
    findMany: vi.fn(
      async ({
        where,
        orderBy,
      }: {
        where: { bookingId: bigint };
        orderBy?: { createdAt: 'asc' };
      }) => {
        let rows = DB.travelers.filter((t) => t.bookingId === where.bookingId);
        if (orderBy?.createdAt === 'asc') {
          rows = [...rows].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return rows.map(projectTraveler);
      },
    ),
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { code: string; bookingId: bigint };
        select: { id: true };
      }) => {
        const row = DB.travelers.find(
          (t) => t.code === where.code && t.bookingId === where.bookingId,
        );
        if (!row) return null;
        return { id: row.id };
      },
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          code: string;
          bookingId: bigint;
          firstName: string;
          lastName: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
        };
      }) => {
        const row: TravelerRow = {
          id: id(),
          code: data.code,
          bookingId: data.bookingId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          notes: data.notes,
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.travelers.push(row);
        return projectTraveler(row);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Record<string, unknown>;
      }) => {
        const row = DB.travelers.find((t) => t.id === where.id)!;
        Object.assign(row, data);
        return projectTraveler(row);
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
        reserved_seats: row.reservedSeats,
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
  DB.travelers = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextCodeSeq = 1;
}

function seedAdminOwner(): void {
  DB.agencies.set(SAHARA.id, SAHARA);
  DB.agencies.set(ATLAS.id, ATLAS);
  addUser(admin);
  const ownerRole = addRole('AGENCY_OWNER', 'AGENCY', SAHARA.id, [...ALL_TRAVELER_PERMISSIONS]);
  addMembership(SAHARA.id, admin.id, [ownerRole.id]);
}

let app: INestApplication;
let adminToken: string;

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
      TravelersModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  adminToken = app.get(JwtService).sign({ sub: admin.id.toString() });
});

beforeEach(() => {
  baseline();
  seedAdminOwner();
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('if the caller is not authenticated', () => {
  it('401 on travelers endpoints', async () => {
    await request(app.getHttpServer()).get(`${base()}/bookings/BKG-000000000001/travelers`).expect(401);
    await request(app.getHttpServer())
      .post(`${base()}/bookings/BKG-000000000001/travelers`)
      .send({ firstName: 'Amel', lastName: 'Benali' })
      .expect(401);
    await request(app.getHttpServer())
      .patch(`${base()}/bookings/BKG-000000000001/travelers/TRV-000000000001`)
      .send({ firstName: 'Amel' })
      .expect(401);
  });
});

describe('POST /v1/agencies/:agencyCode/bookings/:bookingCode/travelers', () => {
  it('adds a traveler with a backend TRV- code to a PENDING booking', async () => {
    const booking = addBooking(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .send({
        firstName: '  Amel  ',
        lastName: 'Benali',
        email: '  AMEL@Example.COM  ',
        phone: '+213 555 12 34 56',
      })
      .expect(201);

    expect(res.body.code).toMatch(/^TRV-[0-9A-F]{12}$/);
    expect(res.body.firstName).toBe('Amel');
    expect(res.body.email).toBe('amel@example.com');
    expect(res.body.phone).toBe('+213 555 12 34 56');

    expect(DB.travelers).toHaveLength(1);
    const audit = DB.auditLog.find((a) => a.action === 'AGENCY_TRAVELER_CREATED');
    expect(audit?.targetCode).toBe(res.body.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
    expect(audit?.metadata).toEqual({ bookingCode: booking.code });
  });

  it('409 BOOKING_TRAVELER_LIMIT_REACHED when the manifest already covers reservedSeats', async () => {
    const booking = addBooking(SAHARA.id, { reservedSeats: 2 });
    addTraveler(booking.id);
    addTraveler(booking.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Sara', lastName: 'Haddad' })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_TRAVELER_LIMIT_REACHED');
    expect(res.body.expected).toBe(2);
    expect(res.body.actual).toBe(2);
    expect(DB.travelers).toHaveLength(2);
  });

  it('409 BOOKING_TRAVELERS_FROZEN when the booking is no longer PENDING', async () => {
    const booking = addBooking(SAHARA.id, { status: 'CONFIRMED' });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel', lastName: 'Benali' })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_TRAVELERS_FROZEN');
    expect(DB.travelers).toHaveLength(0);
  });

  it('404 BOOKING_NOT_FOUND for an unknown booking or a foreign booking', async () => {
    const foreign = addBooking(ATLAS.id);

    const resForeign = await request(app.getHttpServer())
      .post(`${base()}/bookings/${foreign.code}/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel', lastName: 'Benali' })
      .expect(404);
    expect(resForeign.body.errorCode).toBe('BOOKING_NOT_FOUND');

    const resUnknown = await request(app.getHttpServer())
      .post(`${base()}/bookings/BKG-000000000099/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel', lastName: 'Benali' })
      .expect(404);
    expect(resUnknown.body.errorCode).toBe('BOOKING_NOT_FOUND');
  });

  it('400 on blank names, an invalid email, or an unknown body key', async () => {
    const booking = addBooking(SAHARA.id);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: '   ', lastName: 'Benali' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel', lastName: 'Benali', email: 'not-an-email' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel', lastName: 'Benali', agencyId: 123 })
      .expect(400);
  });
});

describe('PATCH /v1/agencies/:agencyCode/bookings/:bookingCode/travelers/:travelerCode', () => {
  it('updates a traveler and clears fields with explicit blanks', async () => {
    const booking = addBooking(SAHARA.id);
    const traveler = addTraveler(booking.id, {
      code: 'TRV-000000000001',
      email: 'amel@example.com',
    });

    const res = await request(app.getHttpServer())
      .patch(`${base()}/bookings/${booking.code}/travelers/${traveler.code}`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel K.', phone: '' })
      .expect(200);

    expect(res.body.firstName).toBe('Amel K.');
    expect(res.body.phone).toBeNull();
    expect(res.body.email).toBe('amel@example.com');

    const audit = DB.auditLog.find((a) => a.action === 'AGENCY_TRAVELER_UPDATED');
    expect(audit?.targetCode).toBe(traveler.code);
    expect(audit?.metadata).toEqual({ bookingCode: booking.code });
  });

  it('409 BOOKING_TRAVELERS_FROZEN when the booking is no longer PENDING', async () => {
    const booking = addBooking(SAHARA.id, { status: 'CONFIRMED' });
    const traveler = addTraveler(booking.id, { code: 'TRV-000000000001' });

    const res = await request(app.getHttpServer())
      .patch(`${base()}/bookings/${booking.code}/travelers/${traveler.code}`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel K.' })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_TRAVELERS_FROZEN');
  });

  it('404 TRAVELER_NOT_FOUND when the code belongs to another booking', async () => {
    const booking = addBooking(SAHARA.id);
    const other = addBooking(SAHARA.id);
    const traveler = addTraveler(other.id, { code: 'TRV-000000000001' });

    const res = await request(app.getHttpServer())
      .patch(`${base()}/bookings/${booking.code}/travelers/${traveler.code}`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Amel K.' })
      .expect(404);

    expect(res.body.errorCode).toBe('TRAVELER_NOT_FOUND');
  });

  it('400 when no traveler fields are provided', async () => {
    const booking = addBooking(SAHARA.id);
    const traveler = addTraveler(booking.id, { code: 'TRV-000000000001' });

    const res = await request(app.getHttpServer())
      .patch(`${base()}/bookings/${booking.code}/travelers/${traveler.code}`)
      .set(authHeader(adminToken))
      .send({})
      .expect(400);

    expect(res.body.message).toBeDefined();
    expect(JSON.stringify(res.body)).toContain('at least one traveler field');
  });
});

describe('GET /v1/agencies/:agencyCode/bookings/:bookingCode/travelers', () => {
  it('lists the travelers of a booking', async () => {
    const booking = addBooking(SAHARA.id);
    addTraveler(booking.id, { code: 'TRV-000000000001', createdAt: new Date('2026-09-20T09:00:00.000Z') });
    addTraveler(booking.id, { code: 'TRV-000000000002', createdAt: new Date('2026-09-20T10:00:00.000Z') });

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}/travelers`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(res.body.map((t: { code: string }) => t.code)).toEqual([
      'TRV-000000000001',
      'TRV-000000000002',
    ]);
  });

  it('404 BOOKING_NOT_FOUND for an unknown booking', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/BKG-000000000099/travelers`)
      .set(authHeader(adminToken))
      .expect(404);
    expect(res.body.errorCode).toBe('BOOKING_NOT_FOUND');
  });
});