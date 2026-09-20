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
import { PricingModule } from './pricing.module.js';

/**
 * Agency tour pricing over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models this domain's dependencies: the agency
 * (status + memberships), the tour (the isolation root), the departures, the
 * pricing options, the departure price rows, and the audit log. The CHECK
 * constraints (status/basis/currency vocabulary, `amount > 0`) and the (tour,
 * name) uniqueness live in the migration and are verified against PostgreSQL
 * there, not here.
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
};

type PricingOptionRow = {
  id: bigint;
  tourId: bigint;
  code: string;
  name: string;
  description: string | null;
  basis: 'per_person' | 'per_booking';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
};

type DeparturePriceRow = {
  departureId: bigint;
  pricingOptionId: bigint;
  amount: number;
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
const DZ = { id: 30n, code: 'AGY-DZAIR000001', name: 'DZ Air', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };

const DB = {
  tours: [] as TourRow[],
  departures: [] as DepartureRow[],
  options: [] as PricingOptionRow[],
  departurePrices: [] as DeparturePriceRow[],
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
let nextTourCode = 1;
let nextOptionCode = 1;
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

function optionCode(): string {
  const value = (nextOptionCode++).toString(16).padStart(12, '0').toUpperCase();
  return `PRC-${value}`;
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
    status: overrides.status ?? 'OPEN',
  };
  DB.departures.push(row);
  return row;
}

function addOption(
  tourId: bigint,
  overrides: Partial<
    Omit<PricingOptionRow, 'id' | 'tourId' | 'code' | 'createdAt' | 'updatedAt'> & { code?: string }
  > = {},
): PricingOptionRow {
  const row: PricingOptionRow = {
    id: id(),
    tourId,
    code: overrides.code ?? optionCode(),
    name: overrides.name ?? 'Adult',
    description: overrides.description ?? null,
    basis: overrides.basis ?? 'per_person',
    currency: overrides.currency ?? 'DZD',
    status: overrides.status ?? 'ACTIVE',
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  };
  DB.options.push(row);
  return row;
}

function addDeparturePrice(
  departureId: bigint,
  pricingOptionId: bigint,
  amount: number,
): void {
  DB.departurePrices.push({ departureId, pricingOptionId, amount });
}

function projectOption(row: PricingOptionRow): PricingOptionRow {
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
  tour: {
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; code: string } }) => {
        const row = DB.tours.find((t) => t.agencyId === where.agencyId && t.code === where.code);
        return row ? { id: row.id, code: row.code, status: row.status } : null;
      },
    ),
  },
  departure: {
    findFirst: vi.fn(
      async ({ where }: { where: { tourId: bigint; code: string } }) => {
        const row = DB.departures.find(
          (d) => d.tourId === where.tourId && d.code === where.code,
        );
        return row ? { id: row.id, code: row.code, status: row.status } : null;
      },
    ),
  },
  pricingOption: {
    findMany: vi.fn(
      async ({
        where,
      }: {
        where: { tourId: bigint; code?: { in: string[] } };
        select?: unknown;
      }) => {
        let rows = DB.options.filter((o) => o.tourId === where.tourId);
        if (where.code?.in) {
          rows = rows.filter((o) => where.code!.in.includes(o.code));
        }
        if (where.code?.in) {
          // Reference shape for the price-set flow: identity plus echoed fields.
          return rows.map((o) => ({
            id: o.id,
            code: o.code,
            name: o.name,
            basis: o.basis,
            currency: o.currency,
            status: o.status,
          }));
        }
        return rows
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(projectOption);
      },
    ),
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { tourId: bigint; code?: string; name?: string };
        select?: unknown;
      }) => {
        let rows = DB.options.filter((o) => o.tourId === where.tourId);
        if (where.code) rows = rows.filter((o) => o.code === where.code);
        if (where.name) {
          rows = rows.filter(
            (o) => o.name.toLowerCase() === where.name!.toLowerCase(),
          );
        }
        if (rows.length === 0) return null;
        const row = rows[0]!;
        return {
          ...projectOption(row),
          // The currency probe only needs `currency`; both shapes are satisfied.
          currency: row.currency,
        };
      },
    ),
    count: vi.fn(
      async ({ where }: { where: { pricingOptionId?: bigint } }) =>
        DB.departurePrices.filter(
          (p) => where.pricingOptionId === undefined || p.pricingOptionId === where.pricingOptionId,
        ).length,
    ),
    create: vi.fn(
      async ({ data }: { data: Record<string, unknown> }) => {
        const row: PricingOptionRow = {
          id: id(),
          tourId: data.tourId as bigint,
          code: data.code as string,
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          basis: data.basis as PricingOptionRow['basis'],
          currency: data.currency as string,
          status: data.status as PricingOptionRow['status'],
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.options.push(row);
        return projectOption(row);
      },
    ),
    update: vi.fn(
      async ({ where, data }: { where: { id: bigint }; data: Record<string, unknown> }) => {
        const row = DB.options.find((o) => o.id === where.id);
        if (!row) throw new Error('pricingOption.update called with an unknown id');
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          (row as unknown as Record<string, unknown>)[key] = value;
        }
        return projectOption(row);
      },
    ),
  },
  departurePrice: {
    findMany: vi.fn(
      async ({ where }: { where: { departureId: bigint } }) =>
        DB.departurePrices
          .filter((p) => p.departureId === where.departureId)
          .map((p) => {
            const option = DB.options.find((o) => o.id === p.pricingOptionId)!;
            return {
              amount: p.amount,
              pricingOption: {
                code: option.code,
                name: option.name,
                basis: option.basis,
                currency: option.currency,
                status: option.status,
              },
            };
          }),
    ),
    groupBy: vi.fn(
      async ({
        by,
        where,
      }: {
        by: string[];
        where: { departure: { tourId: bigint; status?: string } };
      }) => {
        const rows = DB.departurePrices.filter((p) => {
          const departure = DB.departures.find((d) => d.id === p.departureId);
          if (!departure || departure.tourId !== where.departure.tourId) return false;
          return !where.departure.status || departure.status === where.departure.status;
        });
        if (by.includes('pricingOptionId')) {
          const counts = new Map<bigint, number>();
          for (const row of rows) {
            counts.set(row.pricingOptionId, (counts.get(row.pricingOptionId) ?? 0) + 1);
          }
          return [...counts.entries()].map(([pricingOptionId, all]) => ({
            pricingOptionId,
            _count: { _all: all },
          }));
        }
        return [...new Set(rows.map((r) => r.departureId))].map((departureId) => ({
          departureId,
        }));
      },
    ),
    aggregate: vi.fn(
      async ({
        where,
      }: {
        where: { departure: { tourId: bigint; status: string } };
        _min: { amount: boolean };
      }) => {
        const amounts = DB.departurePrices
          .filter((p) => {
            const departure = DB.departures.find((d) => d.id === p.departureId);
            return departure?.tourId === where.departure.tourId && departure.status === where.departure.status;
          })
          .map((p) => p.amount);
        return { _min: { amount: amounts.length === 0 ? null : Math.min(...amounts) } };
      },
    ),
    count: vi.fn(
      async ({ where }: { where: { pricingOptionId: bigint } }) =>
        DB.departurePrices.filter((p) => p.pricingOptionId === where.pricingOptionId).length,
    ),
    deleteMany: vi.fn(
      async ({ where }: { where: { departureId: bigint } }) => {
        const before = DB.departurePrices.length;
        DB.departurePrices = DB.departurePrices.filter(
          (p) => p.departureId !== where.departureId,
        );
        return { count: before - DB.departurePrices.length };
      },
    ),
    createMany: vi.fn(
      async ({
        data,
      }: {
        data: Array<{
          departureId: bigint;
          pricingOptionId: bigint;
          amount: { toString(): string } | number;
        }>;
      }) => {
        DB.departurePrices.push(
          ...data.map((row) => ({
            departureId: row.departureId,
            pricingOptionId: row.pricingOptionId,
            amount: Number(row.amount),
          })),
        );
        return { count: data.length };
      },
    ),
  },
  $transaction: vi.fn(async (operations: unknown[]) => {
    for (const operation of operations) {
      await (operation as Promise<unknown>);
    }
  }),
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
  DB.options = [];
  DB.departurePrices = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextTourCode = 1;
  nextOptionCode = 1;
  nextDepartureCode = 1;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  DB.agencies.set(DZ.id, { ...DZ });
  for (const seed of [admin, employee]) addUser(seed);
}

/** Every pricing permission, so authorization is never the thing under test. */
const ALL_PRICING_PERMISSIONS = ['AGENCY_PRICING_VIEW', 'AGENCY_PRICING_MANAGE'];

describe('Agency pricing API', () => {
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
        PricingModule,
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
  const optionsOf = (tour: TourRow) => `${base()}/tours/${tour.code}/pricing-options`;
  const optionAt = (tour: TourRow, option: PricingOptionRow) =>
    `${base()}/tours/${tour.code}/pricing-options/${option.code}`;
  const pricesAt = (tour: TourRow, departure: DepartureRow) =>
    `${base()}/tours/${tour.code}/departures/${departure.code}/prices`;

  /** Makes the caller an owner holding every pricing permission. */
  function seedAdminOwner(): void {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ALL_PRICING_PERMISSIONS, 'Agency Owner');
    addMembership(SAHARA.id, admin.id, [role.id], { membershipType: 'OWNER' });
  }

  // ------------------------------------------------------------ authorization

  it('401 without a JWT', async () => {
    const res = await request(app.getHttpServer()).get(`${base()}/tours/TUR-000000000000/pricing-options`);
    expect(res.status).toBe(401);
  });

  it('403 without the required pricing permission', async () => {
    const role = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_TOUR_VIEW']);
    addMembership(SAHARA.id, admin.id, [role.id]);
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken).get(optionsOf(tour));
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('403 when the agency is suspended', async () => {
    seedAdminOwner();
    DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken).get(optionsOf(tour));
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
  });

  it('403 on every mutation when MANAGE is missing (VIEW only)', async () => {
    const viewOnly = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_PRICING_VIEW']);
    addMembership(SAHARA.id, employee.id, [viewOnly.id]);
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);
    const departure = addDeparture(tour.id);

    const create = await as(employeeToken)
      .post(optionsOf(tour))
      .send({ name: 'Child', basis: 'per_person' });
    expect(create.status).toBe(403);
    expect(create.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');

    const update = await as(employeeToken)
      .put(optionAt(tour, option))
      .send({ name: 'Renamed', basis: 'per_person' });
    expect(update.status).toBe(403);

    const deactivate = await as(employeeToken).post(`${optionAt(tour, option)}/deactivate`);
    expect(deactivate.status).toBe(403);

    const prices = await as(employeeToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: option.code, amount: 9000 }] });
    expect(prices.status).toBe(403);

    expect(DB.options[0]!.status).toBe('ACTIVE');
    expect(DB.departurePrices).toHaveLength(0);
  });

  // ------------------------------------------------------------------ overview

  it('returns the options newest first plus derived startingPrice and counts', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const child = addOption(tour.id, { name: 'Child', createdAt: new Date('2026-01-01T00:00:00.000Z') });
    const adult = addOption(tour.id, { name: 'Adult', createdAt: new Date('2026-06-01T00:00:00.000Z') });
    const openA = addDeparture(tour.id);
    const openB = addDeparture(tour.id);
    const cancelled = addDeparture(tour.id, { status: 'CANCELLED' });
    addDeparturePrice(openA.id, adult.id, 12000);
    addDeparturePrice(openB.id, adult.id, 9000);
    addDeparturePrice(openA.id, child.id, 6000);
    // Cancelled departures never count toward starting price, but their stored
    // rows DO count toward an option's pricedDepartureCount.
    addDeparturePrice(cancelled.id, adult.id, 1);

    const res = await as(adminToken).get(optionsOf(tour));

    expect(res.status).toBe(200);
    expect(res.body.options.map((o: { name: string }) => o.name)).toEqual(['Adult', 'Child']);
    expect(res.body.startingPrice).toBe(6000);
    expect(res.body.pricedOpenDepartureCount).toBe(2);

    const adultFirst = res.body.options[0];
    expect(adultFirst).toMatchObject({ code: adult.code, basis: 'per_person', currency: 'DZD', status: 'ACTIVE' });
    expect(adultFirst.pricedDepartureCount).toBe(3);
    expect(res.body.options[1].pricedDepartureCount).toBe(1);
  });

  it('reports startingPrice null and empty counts when nothing is priced', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    addOption(tour.id);
    addDeparture(tour.id);

    const res = await as(adminToken).get(optionsOf(tour));

    expect(res.status).toBe(200);
    expect(res.body.startingPrice).toBeNull();
    expect(res.body.pricedOpenDepartureCount).toBe(0);
    expect(res.body.options[0].pricedDepartureCount).toBe(0);
  });

  it('never leaks database internals from the overview', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    addOption(tour.id);
    addDeparture(tour.id);
    addDeparturePrice(DB.departures[0]!.id, DB.options[0]!.id, 5000);

    const res = await as(adminToken).get(optionsOf(tour));
    const serialized = JSON.stringify(res.body);
    for (const leak of ['tourId', 'agencyId', '"id"', '  "id":']) {
      expect(serialized).not.toContain(leak);
    }
  });

  // -------------------------------------------------------------------- create

  it('creates an ACTIVE option with a backend PRC code and records the audit event', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', description: '12 and over', basis: 'per_person' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^PRC-[0-9A-F]{12}$/);
    expect(res.body).toMatchObject({
      name: 'Adult',
      description: '12 and over',
      basis: 'per_person',
      currency: 'DZD',
      status: 'ACTIVE',
      pricedDepartureCount: 0,
    });
    expect(DB.options).toHaveLength(1);
    expect(DB.options[0]!.tourId).toBe(tour.id);

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_PRICING_OPTION_CREATED');
    expect(audit?.targetCode).toBe(res.body.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
    expect(audit?.metadata).toEqual({ tourCode: tour.code });
  });

  it('rejects a client-supplied status or tour reference from the body', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const withStatus = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_person', status: 'INACTIVE' });
    expect(withStatus.status).toBe(400);

    const withTourId = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_person', tourId: 999 });
    expect(withTourId.status).toBe(400);

    expect(DB.options).toHaveLength(0);
  });

  it('400 on an invalid body (blank name, unknown basis, bad currency)', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const blank = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: '   ', basis: 'per_person' });
    expect(blank.status).toBe(400);

    const badBasis = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_group' });
    expect(badBasis.status).toBe(400);

    const badCurrency = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_person', currency: 'USDX' });
    expect(badCurrency.status).toBe(400);

    expect(DB.options).toHaveLength(0);
  });

  it('409 on a duplicated name, case-insensitively', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const first = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_person' });
    expect(first.status).toBe(201);

    const dup = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'adult', basis: 'per_booking' });
    expect(dup.status).toBe(409);
    expect(dup.body.errorCode).toBe('PRICING_OPTION_NAME_TAKEN');

    // The same name on another tour is fine.
    const other = addTour(SAHARA.id);
    const otherTour = await as(adminToken)
      .post(optionsOf(other))
      .send({ name: 'Adult', basis: 'per_person' });
    expect(otherTour.status).toBe(201);

    expect(DB.options).toHaveLength(2);
  });

  it('409 when a new option would mix a currency into the tour', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const usd = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_person', currency: 'USD' });
    expect(usd.status).toBe(201);

    const eur = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Child', basis: 'per_person', currency: 'EUR' });
    expect(eur.status).toBe(409);
    expect(eur.body.errorCode).toBe('PRICING_CURRENCY_MISMATCH');

    // The default (DZD) also mismatches a tour already priced in USD.
    const dzd = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Infant', basis: 'per_person' });
    expect(dzd.status).toBe(409);
    expect(dzd.body.errorCode).toBe('PRICING_CURRENCY_MISMATCH');

    expect(DB.options).toHaveLength(1);
  });

  it('allows the same currency as the tour and uppercases the given code', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const usd = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Adult', basis: 'per_person', currency: 'EUR' });
    expect(usd.status).toBe(201);

    const eur = await as(adminToken)
      .post(optionsOf(tour))
      .send({ name: 'Child', basis: 'per_person', currency: 'eur' });

    expect(eur.status).toBe(201);
    expect(eur.body.currency).toBe('EUR');
  });

  // ------------------------------------------------------------------ details

  it('reads a single option, including deactivated ones', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const live = addOption(tour.id);
    const inactive = addOption(tour.id, { name: 'Child', status: 'INACTIVE' });

    const liveRes = await as(adminToken).get(optionAt(tour, live));
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.status).toBe('ACTIVE');

    const inactiveRes = await as(adminToken).get(optionAt(tour, inactive));
    expect(inactiveRes.status).toBe(200);
    expect(inactiveRes.body.status).toBe('INACTIVE');
  });

  it('404 for a foreign tour, an unknown code, and an option under the wrong tour', async () => {
    seedAdminOwner();
    const foreign = addTour(ATLAS.id);
    const tour = addTour(SAHARA.id);
    const other = addTour(SAHARA.id);
    const onOtherTour = addOption(other.id);

    const foreignRes = await as(adminToken).get(optionsOf(foreign));
    expect(foreignRes.status).toBe(404);
    expect(foreignRes.body.errorCode).toBe('TOUR_NOT_FOUND');

    const unknown = await as(adminToken).get(
      `${base()}/tours/${tour.code}/pricing-options/PRC-000000000000`,
    );
    expect(unknown.status).toBe(404);
    expect(unknown.body.errorCode).toBe('PRICING_OPTION_NOT_FOUND');

    const wrongTour = await as(adminToken).get(optionAt(tour, onOtherTour));
    expect(wrongTour.status).toBe(404);
    expect(wrongTour.body.errorCode).toBe('PRICING_OPTION_NOT_FOUND');
  });

  it('reports pricedDepartureCount as stored rows across all departures', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const adult = addOption(tour.id);
    const open = addDeparture(tour.id);
    const cancelled = addDeparture(tour.id, { status: 'CANCELLED' });
    addDeparturePrice(open.id, adult.id, 10000);
    addDeparturePrice(cancelled.id, adult.id, 8000);

    const res = await as(adminToken).get(optionAt(tour, adult));
    expect(res.status).toBe(200);
    expect(res.body.pricedDepartureCount).toBe(2);
  });

  // -------------------------------------------------------------------- update

  it('replaces the editable definition and keeps currency and status', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id, { currency: 'USD' });

    const res = await as(adminToken)
      .put(optionAt(tour, option))
      .send({ name: 'Adult + Child', description: 'Family pricing', basis: 'per_booking' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Adult + Child',
      description: 'Family pricing',
      basis: 'per_booking',
      currency: 'USD',
      status: 'ACTIVE',
    });

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_PRICING_OPTION_UPDATED');
    expect(audit?.targetCode).toBe(option.code);
    expect(audit?.metadata).toEqual({ tourCode: tour.code });
  });

  it('409 when editing a deactivated option', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id, { status: 'INACTIVE' });

    const res = await as(adminToken)
      .put(optionAt(tour, option))
      .send({ name: 'Renamed', basis: 'per_person' });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('PRICING_OPTION_INACTIVE');
  });

  it('400 when the update body smuggles currency or status', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);

    const withCurrency = await as(adminToken)
      .put(optionAt(tour, option))
      .send({ name: 'A', basis: 'per_person', currency: 'EUR' });
    expect(withCurrency.status).toBe(400);

    const withStatus = await as(adminToken)
      .put(optionAt(tour, option))
      .send({ name: 'A', basis: 'per_person', status: 'INACTIVE' });
    expect(withStatus.status).toBe(400);

    expect(DB.options[0]!.name).toBe('Adult');
  });

  it('409 on renaming into a name another option of the tour already has', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    addOption(tour.id, { name: 'Adult' });
    const child = addOption(tour.id, { name: 'Child' });

    const res = await as(adminToken)
      .put(optionAt(tour, child))
      .send({ name: 'Adult', basis: 'per_person' });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('PRICING_OPTION_NAME_TAKEN');
  });

  // ----------------------------------------------------------------- deactivate

  it('deactivates an option one-way and records the audit event', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);
    const departure = addDeparture(tour.id);
    addDeparturePrice(departure.id, option.id, 10000);

    const res = await as(adminToken).post(`${optionAt(tour, option)}/deactivate`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('INACTIVE');
    // Stored prices survive deactivation.
    expect(DB.departurePrices).toHaveLength(1);

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_PRICING_OPTION_DEACTIVATED');
    expect(audit?.targetCode).toBe(option.code);
    expect(audit?.metadata).toEqual({ tourCode: tour.code });

    const again = await as(adminToken).post(`${optionAt(tour, option)}/deactivate`);
    expect(again.status).toBe(409);
    expect(again.body.errorCode).toBe('PRICING_OPTION_ALREADY_INACTIVE');
  });

  // -------------------------------------------------------------- price set GET

  it('returns the stored price set with its single currency and option echoes', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const adult = addOption(tour.id, { name: 'Adult', basis: 'per_person' });
    const supplement = addOption(tour.id, { name: 'Single supplement', basis: 'per_booking' });
    const departure = addDeparture(tour.id);
    addDeparturePrice(departure.id, adult.id, 12000);
    addDeparturePrice(departure.id, supplement.id, 6000);

    const res = await as(adminToken).get(pricesAt(tour, departure));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      departureCode: departure.code,
      currency: 'DZD',
      prices: [
        { pricingOptionCode: adult.code, pricingOptionName: 'Adult', basis: 'per_person', currency: 'DZD', amount: 12000, active: true },
        { pricingOptionCode: supplement.code, pricingOptionName: 'Single supplement', basis: 'per_booking', currency: 'DZD', amount: 6000, active: true },
      ],
    });
  });

  it('returns a null-currency empty set for an unpriced departure', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);

    const res = await as(adminToken).get(pricesAt(tour, departure));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ departureCode: departure.code, currency: null, prices: [] });
  });

  it('never leaks database internals from a price set', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);
    const departure = addDeparture(tour.id);
    addDeparturePrice(departure.id, option.id, 5000);

    const res = await as(adminToken).get(pricesAt(tour, departure));
    const serialized = JSON.stringify(res.body);
    for (const leak of ['tourId', 'agencyId', '"id"', '  "id":', 'pricingOptionId']) {
      expect(serialized).not.toContain(leak);
    }
  });

  // -------------------------------------------------------------- price set PUT

  it('replaces the whole set in one transaction and records option count + currency', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const adult = addOption(tour.id);
    const child = addOption(tour.id, { name: 'Child' });
    const stale = addOption(tour.id, { name: 'Infant' });
    const departure = addDeparture(tour.id);
    addDeparturePrice(departure.id, stale.id, 3000);

    const res = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({
        prices: [
          { pricingOptionCode: adult.code, amount: 12000 },
          { pricingOptionCode: child.code, amount: 9000 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('DZD');
    expect(res.body.prices).toHaveLength(2);
    expect(res.body.prices.map((p: { pricingOptionCode: string }) => p.pricingOptionCode)).toEqual([adult.code, child.code]);
    // The old row dropped out of the set.
    expect(DB.departurePrices).toHaveLength(2);

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_DEPARTURE_PRICES_REPLACED');
    expect(audit?.targetCode).toBe(departure.code);
    expect(audit?.metadata).toEqual({ tourCode: tour.code, optionCount: 2, currency: 'DZD' });
  });

  it('clears the whole set with an empty prices array', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);
    const departure = addDeparture(tour.id);
    addDeparturePrice(departure.id, option.id, 5000);

    const res = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ departureCode: departure.code, currency: null, prices: [] });
    expect(DB.departurePrices).toHaveLength(0);
  });

  it('400 on duplicate codes, invalid amounts, or foreign keys in the body', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);
    const departure = addDeparture(tour.id);

    const duplicate = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({
        prices: [
          { pricingOptionCode: option.code, amount: 1000 },
          { pricingOptionCode: option.code, amount: 2000 },
        ],
      });
    expect(duplicate.status).toBe(400);

    const negative = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: option.code, amount: -5 }] });
    expect(negative.status).toBe(400);

    const threeDecimals = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: option.code, amount: 10.555 }] });
    expect(threeDecimals.status).toBe(400);

    const withTourId = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: option.code, amount: 1000 }], tourId: 1 });
    expect(withTourId.status).toBe(400);

    expect(DB.departurePrices).toHaveLength(0);
  });

  it('404 when an option code is unknown or belongs to another tour, and stores nothing', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const other = addTour(SAHARA.id);
    const foreign = addTour(ATLAS.id);
    const onOtherTour = addOption(other.id);
    const foreignOption = addOption(foreign.id);
    const departure = addDeparture(tour.id);

    const unknown = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: 'PRC-000000000000', amount: 1000 }] });
    expect(unknown.status).toBe(404);
    expect(unknown.body.errorCode).toBe('PRICING_OPTION_NOT_FOUND');

    const wrongTour = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: onOtherTour.code, amount: 1000 }] });
    expect(wrongTour.status).toBe(404);
    expect(wrongTour.body.errorCode).toBe('PRICING_OPTION_NOT_FOUND');

    const foreignToo = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: foreignOption.code, amount: 1000 }] });
    expect(foreignToo.status).toBe(404);

    expect(DB.departurePrices).toHaveLength(0);
  });

  it('409 when the set references a deactivated option', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const inactive = addOption(tour.id, { status: 'INACTIVE' });
    const departure = addDeparture(tour.id);

    const res = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({ prices: [{ pricingOptionCode: inactive.code, amount: 4000 }] });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('PRICING_OPTION_INACTIVE');
    expect(DB.departurePrices).toHaveLength(0);
  });

  it('409 when the set would mix currencies', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    // Defense in depth: the create flow prevents mixed currencies on one tour,
    // so seed two differently-priced options directly.
    const usd = addOption(tour.id, { currency: 'USD' });
    const eur = addOption(tour.id, { name: 'Child', currency: 'EUR' });
    const departure = addDeparture(tour.id);

    const res = await as(adminToken)
      .put(pricesAt(tour, departure))
      .send({
        prices: [
          { pricingOptionCode: usd.code, amount: 1000 },
          { pricingOptionCode: eur.code, amount: 2000 },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('PRICING_CURRENCY_MISMATCH');
    expect(DB.departurePrices).toHaveLength(0);
  });

  it('409 when pricing a cancelled departure', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id);
    const cancelled = addDeparture(tour.id, { status: 'CANCELLED' });

    const res = await as(adminToken)
      .put(pricesAt(tour, cancelled))
      .send({ prices: [{ pricingOptionCode: option.code, amount: 5000 }] });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DEPARTURE_ALREADY_CANCELLED');
    expect(DB.departurePrices).toHaveLength(0);
  });

  it('flips active to false on the set of a deactivated option', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);
    const option = addOption(tour.id, { status: 'INACTIVE' });
    const departure = addDeparture(tour.id);
    addDeparturePrice(departure.id, option.id, 4000);

    const res = await as(adminToken).get(pricesAt(tour, departure));

    expect(res.status).toBe(200);
    expect(res.body.prices[0]).toMatchObject({
      pricingOptionCode: option.code,
      amount: 4000,
      active: false,
    });
  });

  // --------------------------------------------------------- tenant isolation

  it('returns 404 for a tour of another agency even with a pricing permit', async () => {
    seedAdminOwner();
    const foreign = addTour(ATLAS.id);

    const res = await as(adminToken).get(optionsOf(foreign));
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('TOUR_NOT_FOUND');
  });

  it('cannot act on an agency the caller is not a member of', async () => {
    seedAdminOwner();
    const tour = addTour(ATLAS.id);

    const res = await as(adminToken).get(`${base(ATLAS.code)}/tours/${tour.code}/pricing-options`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });
});