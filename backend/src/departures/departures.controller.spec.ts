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
import { DeparturesModule } from './departures.module.js';

/**
 * Agency departures over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models this domain's dependencies: the agency
 * (status + memberships), the tour (the isolation root), the departures, and
 * the audit log. The CHECK constraints (status vocabulary, `end_at > start_at`,
 * capacity, deadline placement) live in the migration and are verified against
 * PostgreSQL there, not here.
 */

type TourRow = {
  id: bigint;
  agencyId: bigint;
  code: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type DepartureRow = {
  id: bigint;
  tourId: bigint;
  code: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  startAt: Date;
  endAt: Date;
  capacity: number;
  bookingDeadline: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingRow = {
  id: bigint;
  departureId: bigint;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  reservedSeats: number;
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
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };

const DB = {
  tours: [] as TourRow[],
  departures: [] as DepartureRow[],
  bookings: [] as BookingRow[],
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  auditLog: [] as Array<{ action: string; targetCode?: string; agencyCode?: string; metadata?: unknown }>,
};

let nextId = 100n;
let nextTourCode = 1;
let nextDepartureCode = 1;
function id(): bigint {
  const value = nextId;
  nextId += 1n;
  return value;
}

function tourCode(): string {
  const value = (nextTourCode++).toString(16).padStart(12, '0').toUpperCase();
  return `TUR-${value}`;
}

function departureCode(): string {
  const value = (nextDepartureCode++).toString(16).padStart(12, '0').toUpperCase();
  return `DEP-${value}`;
}

function addRole(
  key: string,
  scope: string,
  agencyId: bigint | null,
  permissionKeys: string[] = [],
  name = key,
): RoleRow {
  const row: RoleRow = { id: id(), key, name, description: `${name} description`, scope, agencyId, permissionKeys };
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
  overrides: Partial<MembershipRow> = {},
): MembershipRow {
  const row: MembershipRow = {
    id: id(),
    agencyId,
    appUserId,
    membershipType: 'EMPLOYEE',
    status: 'ACTIVE',
    createdAt: NOW,
    roleIds,
    ...overrides,
  };
  DB.memberships.push(row);
  return row;
}

function addTour(
  agencyId: bigint,
  overrides: Partial<Pick<TourRow, 'code' | 'status'>> = {},
): TourRow {
  const row: TourRow = {
    id: id(),
    agencyId,
    code: overrides.code ?? tourCode(),
    status: overrides.status ?? 'DRAFT',
  };
  DB.tours.push(row);
  return row;
}

function addDeparture(
  tourId: bigint,
  overrides: Partial<Omit<DepartureRow, 'id' | 'tourId' | 'code'> & { code?: string }> = {},
): DepartureRow {
  const row: DepartureRow = {
    id: id(),
    tourId,
    code: overrides.code ?? departureCode(),
    status: 'OPEN',
    startAt: new Date('2026-12-20T08:00:00.000Z'),
    endAt: new Date('2026-12-20T18:00:00.000Z'),
    capacity: 12,
    bookingDeadline: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.departures.push(row);
  return row;
}

function addBooking(
  departureId: bigint,
  overrides: Partial<BookingRow> = {},
): BookingRow {
  const row: BookingRow = {
    id: id(),
    departureId,
    status: 'PENDING',
    reservedSeats: 2,
    ...overrides,
  };
  DB.bookings.push(row);
  return row;
}

/** A valid creation payload, ready to be overridden per test. */
function createPayload() {
  return {
    startAt: '2026-12-20T08:00:00.000Z',
    endAt: '2026-12-20T18:00:00.000Z',
    capacity: 12,
    bookingDeadline: null,
    notes: 'Meet at the parking lot by 07:45.',
  };
}

function projectDeparture(row: DepartureRow): DepartureRow {
  return { ...row };
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(
      async ({ where }: { where: { id?: bigint; code?: string; email?: string } }) => {
        const user = [...DB.users.values()].find(
          (u) =>
            (where.id !== undefined && u.id === where.id) ||
            (where.code !== undefined && u.code === where.code) ||
            (where.email !== undefined && u.email === where.email),
        );
        return user ? { ...user } : null;
      },
    ),
  },
  role: {
    findMany: vi.fn(
      async ({ where }: { where: { key?: { in: string[] }; scope?: string; OR?: unknown[] } }) => {
        let rows = [...DB.roles.values()];
        if (where.key?.in) rows = rows.filter((r) => where.key!.in.includes(r.key));
        if (where.scope) rows = rows.filter((r) => r.scope === where.scope);
        if (where.OR) {
          const allowed = (where.OR as Array<{ agencyId: bigint | null }>).map((o) => o.agencyId);
          rows = rows.filter((r) => allowed.some((a) => a === r.agencyId));
        }
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          scope: r.scope,
          agencyId: r.agencyId,
        }));
      },
    ),
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
  agencyMembership: {
    findMany: vi.fn(async () => []),
  },
  booking: {
    aggregate: vi.fn(
      async ({
        where,
      }: {
        where: { departureId: bigint; status: { in: string[] } };
      }) => {
        const reservedSeats = DB.bookings
          .filter(
            (b) =>
              b.departureId === where.departureId &&
              where.status.in.includes(b.status),
          )
          .reduce((sum, b) => sum + b.reservedSeats, 0);
        return { _sum: { reservedSeats } };
      },
    ),
  },
  $queryRaw: vi.fn(async (_template: unknown, ...values: unknown[]) => {
    const departureId = values[0] as bigint;
    const row = DB.departures.find((d) => d.id === departureId);
    if (!row) return [];
    return [{ status: row.status }];
  }),
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg !== 'function') return undefined;
    return arg(prismaMock);
  }),
  tour: {
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; code: string } }) => {
        const row = DB.tours.find((t) => t.agencyId === where.agencyId && t.code === where.code);
        return row ? { id: row.id, code: row.code, status: row.status } : null;
      },
    ),
  },
  departure: {
    findMany: vi.fn(
      async ({ where }: { where: { tourId: bigint; status?: string } }) =>
        DB.departures
          .filter((d) => d.tourId === where.tourId && (!where.status || d.status === where.status))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(projectDeparture),
    ),
    findFirst: vi.fn(
      async ({ where }: { where: { tourId: bigint; code: string } }) => {
        const row = DB.departures.find(
          (d) => d.tourId === where.tourId && d.code === where.code,
        );
        return row ? projectDeparture(row) : null;
      },
    ),
    create: vi.fn(
      async ({ data }: { data: Record<string, unknown> }) => {
        const row: DepartureRow = {
          id: id(),
          tourId: data.tourId as bigint,
          code: data.code as string,
          status: (data.status as 'OPEN' | 'CLOSED' | 'CANCELLED') ?? 'OPEN',
          startAt: (data.startAt as Date) ?? NOW,
          endAt: (data.endAt as Date) ?? NOW,
          capacity: data.capacity as number,
          bookingDeadline: (data.bookingDeadline as Date | null) ?? null,
          notes: (data.notes as string | null) ?? null,
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.departures.push(row);
        return projectDeparture(row);
      },
    ),
    update: vi.fn(
      async ({ where, data }: { where: { id: bigint }; data: Record<string, unknown> }) => {
        const row = DB.departures.find((d) => d.id === where.id);
        if (!row) throw new Error('departure.update called with an unknown id');
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          (row as unknown as Record<string, unknown>)[key] = value;
        }
        return projectDeparture(row);
      },
    ),
    count: vi.fn(
      async ({ where }: { where: { tourId: bigint; status: string } }) =>
        DB.departures.filter((d) => d.tourId === where.tourId && d.status === where.status)
          .length,
    ),
  },
  auditLog: {
    create: vi.fn(
      async ({
        data,
      }: {
        data: { action: string; targetCode?: string | null; agencyCode?: string | null; metadata?: unknown };
      }) => {
        DB.auditLog.push({
          action: data.action,
          targetCode: data.targetCode ?? undefined,
          agencyCode: data.agencyCode ?? undefined,
          metadata: data.metadata,
        });
        return { id: 1n };
      },
    ),
  },
};

function baseline(): void {
  DB.tours = [];
  DB.departures = [];
  DB.bookings = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextTourCode = 1;
  nextDepartureCode = 1;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  for (const seed of [admin, employee]) addUser(seed);
}

/** Every departure permission, so authorization is never the thing under test. */
const ALL_DEPARTURE_PERMISSIONS = [
  'AGENCY_DEPARTURE_VIEW',
  'AGENCY_DEPARTURE_CREATE',
  'AGENCY_DEPARTURE_UPDATE',
  'AGENCY_DEPARTURE_DELETE',
];

describe('Agency departures API', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        AuthorizationModule,
        SecurityModule,
        DeparturesModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    adminToken = jwt.sign({ sub: admin.id.toString() });
    employeeToken = jwt.sign({ sub: employee.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const cookie = (v: string) => `travel_access_token=${v}`;
  const as = (token: string) => ({
    get: (p: string) => request(app.getHttpServer()).get(p).set('Cookie', cookie(token)),
    post: (p: string) => request(app.getHttpServer()).post(p).set('Cookie', cookie(token)),
    put: (p: string) => request(app.getHttpServer()).put(p).set('Cookie', cookie(token)),
  });

  const base = (code = SAHARA.code) => `/v1/agencies/${code}`;

  /** Makes the caller an owner holding every departure permission. */
  function seedAdminOwner(): void {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ALL_DEPARTURE_PERMISSIONS, 'Agency Owner');
    addMembership(SAHARA.id, admin.id, [role.id], { membershipType: 'OWNER' });
  }

  // ------------------------------------------------------------ authorization

  it('401 without a JWT', async () => {
    const tour = addTour(SAHARA.id);
    const res = await request(app.getHttpServer()).get(
      `${base()}/tours/${tour.code}/departures`,
    );
    expect(res.status).toBe(401);
  });

  it('403 without the required departure permission', async () => {
    const role = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_TOUR_VIEW']);
    addMembership(SAHARA.id, admin.id, [role.id]);
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken).get(`${base()}/tours/${tour.code}/departures`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('403 when the agency is suspended', async () => {
    seedAdminOwner();
    DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken).get(`${base()}/tours/${tour.code}/departures`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
  });

  it('403 on create/update/cancel when the matching permission is missing', async () => {
    const viewOnly = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_DEPARTURE_VIEW']);
    addMembership(SAHARA.id, employee.id, [viewOnly.id]);
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);

    const create = await as(employeeToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send(createPayload());
    expect(create.status).toBe(403);
    expect(create.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');

    const update = await as(employeeToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({ ...createPayload(), status: 'CLOSED' });
    expect(update.status).toBe(403);

    const cancel = await as(employeeToken).post(
      `${base()}/tours/${tour.code}/departures/${departure.code}/cancel`,
    );
    expect(cancel.status).toBe(403);

    expect(DB.departures).toHaveLength(1);
    expect(DB.departures[0]!.status).toBe('OPEN');
  });

  // -------------------------------------------------------------------- create

  it('creates an OPEN departure with a backend code and records the audit event', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send(createPayload());

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^DEP-[0-9A-F]{12}$/);
    expect(res.body).toMatchObject({
      status: 'OPEN',
      startAt: '2026-12-20T08:00:00.000Z',
      endAt: '2026-12-20T18:00:00.000Z',
      capacity: 12,
      bookingDeadline: null,
      notes: 'Meet at the parking lot by 07:45.',
    });
    expect(DB.departures).toHaveLength(1);
    expect(DB.departures[0]!.tourId).toBe(tour.id);
    expect(tour.status).toBe('DRAFT');

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_DEPARTURE_CREATED');
    expect(audit?.targetCode).toBe(res.body.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
    expect(audit?.metadata).toEqual({ tourCode: tour.code });
  });

  it('rejects a client-supplied status or tour reference from the body', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const withStatus = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), status: 'CANCELLED' });
    expect(withStatus.status).toBe(400);

    const withTourId = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), tourId: 999 });
    expect(withTourId.status).toBe(400);

    expect(DB.departures).toHaveLength(0);
  });

  it('400 on invalid dates, capacity, or deadline, and stores nothing', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const endsBeforeStart = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), endAt: '2026-12-20T07:00:00.000Z' });
    expect(endsBeforeStart.status).toBe(400);

    const equalDates = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), endAt: '2026-12-20T08:00:00.000Z' });
    expect(equalDates.status).toBe(400);

    const deadlineAfterStart = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), bookingDeadline: '2026-12-21T08:00:00.000Z' });
    expect(deadlineAfterStart.status).toBe(400);

    const zeroCapacity = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), capacity: 0 });
    expect(zeroCapacity.status).toBe(400);

    const badDeadline = await as(adminToken)
      .post(`${base()}/tours/${tour.code}/departures`)
      .send({ ...createPayload(), bookingDeadline: 'not-a-date' });
    expect(badDeadline.status).toBe(400);

    expect(DB.departures).toHaveLength(0);
  });

  // ---------------------------------------------------------------------- list

  it('lists the departures of one tour, newest first, filtered by status', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const other = addTour(SAHARA.id);
    addDeparture(tour.id, {
      startAt: new Date('2026-11-01T08:00:00.000Z'),
      endAt: new Date('2026-11-01T18:00:00.000Z'),
      status: 'CLOSED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    addDeparture(tour.id, {
      startAt: new Date('2026-12-20T08:00:00.000Z'),
      endAt: new Date('2026-12-20T18:00:00.000Z'),
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    addDeparture(other.id, {
      startAt: new Date('2027-01-01T08:00:00.000Z'),
      endAt: new Date('2027-01-01T18:00:00.000Z'),
    });

    const res = await as(adminToken).get(`${base()}/tours/${tour.code}/departures`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((d: { status: string }) => d.status)).toEqual(['OPEN', 'CLOSED']);

    const openOnly = await as(adminToken).get(
      `${base()}/tours/${tour.code}/departures?status=OPEN`,
    );
    expect(openOnly.status).toBe(200);
    expect(openOnly.body).toHaveLength(1);
    expect(openOnly.body[0].status).toBe('OPEN');
  });

  it('never leaks database internals', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    addDeparture(tour.id);

    const res = await as(adminToken).get(`${base()}/tours/${tour.code}/departures`);
    const serialized = JSON.stringify(res.body);
    for (const leak of ['tourId', 'agencyId', '"id"', '  "id":']) {
      expect(serialized).not.toContain(leak);
    }
  });

  // ------------------------------------------------------------------ details

  it('reads a departure by code, including cancelled ones', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const live = addDeparture(tour.id);
    const cancelled = addDeparture(tour.id, { status: 'CANCELLED' });

    const res = await as(adminToken).get(`${base()}/tours/${tour.code}/departures/${cancelled.code}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(cancelled.code);
    expect(res.body.status).toBe('CANCELLED');

    const liveRes = await as(adminToken).get(`${base()}/tours/${tour.code}/departures/${live.code}`);
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.code).toBe(live.code);
  });

  it('404 for a foreign tour, an unknown departure code, and a departure under the wrong tour', async () => {
    seedAdminOwner();
    const foreign = addTour(ATLAS.id);
    const tour = addTour(SAHARA.id);
    const other = addTour(SAHARA.id);
    const onOtherTour = addDeparture(other.id);

    const foreignRes = await as(adminToken).get(
      `${base()}/tours/${foreign.code}/departures`,
    );
    expect(foreignRes.status).toBe(404);
    expect(foreignRes.body.errorCode).toBe('TOUR_NOT_FOUND');

    const unknown = await as(adminToken).get(
      `${base()}/tours/${tour.code}/departures/DEP-000000000000`,
    );
    expect(unknown.status).toBe(404);
    expect(unknown.body.errorCode).toBe('DEPARTURE_NOT_FOUND');

    // The code exists in the agency, but not under THIS tour.
    const wrongTour = await as(adminToken).get(
      `${base()}/tours/${tour.code}/departures/${onOtherTour.code}`,
    );
    expect(wrongTour.status).toBe(404);
    expect(wrongTour.body.errorCode).toBe('DEPARTURE_NOT_FOUND');
  });

  // -------------------------------------------------------------------- update

  it('replaces the operational fields and moves status between OPEN and CLOSED', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);

    const close = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({
        startAt: '2026-12-21T08:00:00.000Z',
        endAt: '2026-12-21T20:00:00.000Z',
        capacity: 9,
        bookingDeadline: '2026-12-10T23:59:00.000Z',
        notes: 'Moved to a winter departure.',
        status: 'CLOSED',
      });
    expect(close.status).toBe(200);
    expect(close.body.status).toBe('CLOSED');
    expect(close.body).toMatchObject({
      startAt: '2026-12-21T08:00:00.000Z',
      capacity: 9,
      bookingDeadline: '2026-12-10T23:59:00.000Z',
    });
    expect(tour.status).toBe('DRAFT');

    const reopen = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({ ...createPayload(), status: 'OPEN' });
    expect(reopen.status).toBe(200);
    expect(reopen.body.status).toBe('OPEN');

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_DEPARTURE_UPDATED');
    expect(audit?.targetCode).toBe(departure.code);
    expect(audit?.metadata).toEqual({ tourCode: tour.code });
  });

  it('409 when editing a cancelled departure', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { status: 'CANCELLED' });

    const res = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({ ...createPayload(), status: 'OPEN' });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DEPARTURE_ALREADY_CANCELLED');
  });

  it('400 and 404 on update: bad dates mutate nothing, foreign departure is invisible', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);

    const bad = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({ ...createPayload(), endAt: '2026-12-20T07:00:00.000Z', status: 'OPEN' });
    expect(bad.status).toBe(400);
    expect(DB.departures[0]!.capacity).toBe(12);

    const foreign = addTour(ATLAS.id);
    const foreignDeparture = addDeparture(foreign.id);
    const missing = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${foreignDeparture.code}`)
      .send({ ...createPayload(), status: 'OPEN' });
    expect(missing.status).toBe(404);
    expect(missing.body.errorCode).toBe('DEPARTURE_NOT_FOUND');
  });

  it('409 DEPARTURE_CAPACITY_BELOW_RESERVED when capacity drops below reserved seats', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { capacity: 12 });
    addBooking(departure.id, { reservedSeats: 6 });
    addBooking(departure.id, { status: 'CONFIRMED', reservedSeats: 2 });

    const res = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({ ...createPayload(), capacity: 7, status: 'OPEN' });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DEPARTURE_CAPACITY_BELOW_RESERVED');
    expect(DB.departures[0]!.capacity).toBe(12);
  });

  it('allows a capacity equal to the reserved seats and ignores released seats', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { capacity: 12 });
    addBooking(departure.id, { status: 'CANCELLED', reservedSeats: 9 });
    addBooking(departure.id, { reservedSeats: 4 });

    const res = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${departure.code}`)
      .send({ ...createPayload(), capacity: 4, status: 'CLOSED' });

    expect(res.status).toBe(200);
    expect(res.body.capacity).toBe(4);
    expect(res.body.status).toBe('CLOSED');
  });

  // -------------------------------------------------------------------- cancel

  it('cancels a departure one-way and records the audit event', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    addDeparture(tour.id, { status: 'CLOSED' });
    const open = addDeparture(tour.id);

    const res = await as(adminToken).post(
      `${base()}/tours/${tour.code}/departures/${open.code}/cancel`,
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_DEPARTURE_CANCELLED');
    expect(audit?.targetCode).toBe(open.code);
    expect(audit?.metadata).toEqual({
      tourCode: tour.code,
      tourStatus: 'DRAFT',
      remainingOpenDepartures: 0,
    });

    const again = await as(adminToken).post(
      `${base()}/tours/${tour.code}/departures/${open.code}/cancel`,
    );
    expect(again.status).toBe(409);
    expect(again.body.errorCode).toBe('DEPARTURE_ALREADY_CANCELLED');

    const edit = await as(adminToken)
      .put(`${base()}/tours/${tour.code}/departures/${open.code}`)
      .send({ ...createPayload(), status: 'OPEN' });
    expect(edit.status).toBe(409);
  });

  it('409 DEPARTURE_HAS_ACTIVE_BOOKINGS while a departure still has reserved seats', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    addBooking(departure.id, { status: 'PENDING', reservedSeats: 2 });
    addBooking(departure.id, { status: 'CONFIRMED', reservedSeats: 3 });

    const res = await as(adminToken).post(
      `${base()}/tours/${tour.code}/departures/${departure.code}/cancel`,
    );

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DEPARTURE_HAS_ACTIVE_BOOKINGS');
    expect(DB.departures[0]!.status).toBe('OPEN');
  });

  it('cancels a departure once all its bookings released their seats', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    addBooking(departure.id, { status: 'CANCELLED', reservedSeats: 2 });

    const res = await as(adminToken).post(
      `${base()}/tours/${tour.code}/departures/${departure.code}/cancel`,
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(DB.departures[0]!.status).toBe('CANCELLED');
  });

  it('cancelling the last OPEN departure of a PUBLISHED scheduled tour leaves it PUBLISHED', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, { status: 'PUBLISHED' });
    const only = addDeparture(tour.id);

    const res = await as(adminToken).post(
      `${base()}/tours/${tour.code}/departures/${only.code}/cancel`,
    );

    expect(res.status).toBe(200);
    expect(DB.departures[0]!.status).toBe('CANCELLED');
    // The tour status is never touched silently.
    expect(DB.tours[0]!.status).toBe('PUBLISHED');
    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_DEPARTURE_CANCELLED');
    expect(audit?.metadata).toEqual({
      tourCode: tour.code,
      tourStatus: 'PUBLISHED',
      remainingOpenDepartures: 0,
    });
  });

  it('reports the remaining OPEN count when a cancellation leaves other departures', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    addDeparture(tour.id); // stays OPEN
    const cancelled = addDeparture(tour.id, { status: 'OPEN' });

    const res = await as(adminToken).post(
      `${base()}/tours/${tour.code}/departures/${cancelled.code}/cancel`,
    );

    expect(res.status).toBe(200);
    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_DEPARTURE_CANCELLED');
    expect(audit?.metadata).toEqual({
      tourCode: tour.code,
      tourStatus: 'DRAFT',
      remainingOpenDepartures: 1,
    });
  });

  // --------------------------------------------------------- tenant isolation

  it('cannot act on an agency the caller is not a member of', async () => {
    seedAdminOwner();
    const tour = addTour(ATLAS.id);

    const res = await as(adminToken).get(`${base(ATLAS.code)}/tours/${tour.code}/departures`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });
});