import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SecurityModule } from '../security/security.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { CustomersModule } from './customers.module.js';

/**
 * Agency customers over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models the pieces this domain depends on: the
 * agency (status + memberships), the customer row, and the audit log. The
 * `customer_status_check` constraint itself is verified against PostgreSQL in
 * the migration, not here.
 */

type CustomerRow = {
  id: bigint;
  code: string;
  agencyId: bigint;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
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

const NOW = new Date('2026-09-19T10:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };

const DB = {
  customers: [] as CustomerRow[],
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  auditLog: [] as Array<{ action: string; targetCode?: string; agencyCode?: string }>,
};

let nextId = 100n;
let nextCustomerCode = 1;
function id(): bigint {
  const value = nextId;
  nextId += 1n;
  return value;
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

function addCustomer(agencyId: bigint, overrides: Partial<Omit<CustomerRow, 'agencyId'>> = {}): CustomerRow {
  const code =
    overrides.code ?? `CUS-${(nextCustomerCode++).toString(16).padStart(12, '0').toUpperCase()}`;
  const row: CustomerRow = {
    id: id(),
    code,
    agencyId,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    notes: null,
    status: 'ACTIVE',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.customers.push(row);
  return row;
}

function matches(customer: CustomerRow, term: string): boolean {
  const needle = term.toLowerCase();
  return [customer.code, customer.firstName, customer.lastName, customer.email, customer.phone]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle));
}

function containsOf(where: unknown): string | undefined {
  const or = (where as { OR?: Array<Record<string, { contains: string }>> } | undefined)?.OR;
  if (!or?.length) return undefined;
  return Object.values(or[0]!)[0]!.contains;
}

function projectCustomer(c: CustomerRow) {
  return {
    id: c.id,
    code: c.code,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
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
  customer: {
    findMany: vi.fn(async ({ where }: { where: { agencyId: bigint; status?: string; OR?: unknown[] } }) => {
      let rows = DB.customers.filter((c) => c.agencyId === where.agencyId);
      if (where.status) rows = rows.filter((c) => c.status === where.status);
      const term = containsOf(where);
      if (term) rows = rows.filter((c) => matches(c, term));
      return rows
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(projectCustomer);
    }),
    findFirst: vi.fn(async ({ where }: { where: { agencyId: bigint; code: string } }) => {
      const row = DB.customers.find((c) => c.agencyId === where.agencyId && c.code === where.code);
      return row ? projectCustomer(row) : null;
    }),
    create: vi.fn(async ({ data }: { data: Partial<CustomerRow> }) => {
      const row: CustomerRow = {
        id: id(),
        code: data.code!,
        agencyId: data.agencyId!,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
      };
      DB.customers.push(row);
      return projectCustomer(row);
    }),
    update: vi.fn(async ({ where, data }: { where: { id: bigint }; data: Partial<CustomerRow> }) => {
      const row = DB.customers.find((r) => r.id === where.id)!;
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) (row as unknown as Record<string, unknown>)[key] = value;
      }
      return projectCustomer(row);
    }),
  },
  auditLog: {
    create: vi.fn(async ({ data }: { data: { action: string; targetCode?: string | null; agencyCode?: string | null } }) => {
      DB.auditLog.push({
        action: data.action,
        targetCode: data.targetCode ?? undefined,
        agencyCode: data.agencyCode ?? undefined,
      });
      return { id: 1n };
    }),
  },
};

function baseline(): void {
  DB.customers = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextCustomerCode = 1;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  for (const seed of [admin, employee]) addUser(seed);
}

/** Every customer permission, so authorization is never the thing under test. */
const ALL_CUSTOMER_PERMISSIONS = [
  'AGENCY_CUSTOMER_VIEW',
  'AGENCY_CUSTOMER_CREATE',
  'AGENCY_CUSTOMER_UPDATE',
  'AGENCY_CUSTOMER_ARCHIVE',
];

describe('Agency customers API', () => {
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
        CustomersModule,
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
    patch: (p: string) => request(app.getHttpServer()).patch(p).set('Cookie', cookie(token)),
  });

  const base = (code = SAHARA.code) => `/v1/agencies/${code}`;

  /** Makes the caller an owner holding every customer permission. */
  function seedAdminOwner(): void {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ALL_CUSTOMER_PERMISSIONS, 'Agency Owner');
    addMembership(SAHARA.id, admin.id, [role.id], { membershipType: 'OWNER' });
  }

  // ------------------------------------------------------------ authorization

  it('401 without a JWT', async () => {
    expect((await request(app.getHttpServer()).get(`${base()}/customers`)).status).toBe(401);
  });

  it('403 without the required customer permission', async () => {
    const role = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_AGENCY_VIEW']);
    addMembership(SAHARA.id, admin.id, [role.id]);

    const res = await as(adminToken).get(`${base()}/customers`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('403 when the agency is suspended', async () => {
    seedAdminOwner();
    DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';

    const res = await as(adminToken).get(`${base()}/customers`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
  });

  it('403 on create/update/archive when the matching permission is missing', async () => {
    const viewOnly = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_CUSTOMER_VIEW']);
    addMembership(SAHARA.id, employee.id, [viewOnly.id]);
    const customer = addCustomer(SAHARA.id, { firstName: 'Sara' });

    const create = await as(employeeToken)
      .post(`${base()}/customers`)
      .send({ firstName: 'Noor' });
    expect(create.status).toBe(403);
    expect(create.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');

    const update = await as(employeeToken)
      .patch(`${base()}/customers/${customer.code}`)
      .send({ phone: 'NEW' });
    expect(update.status).toBe(403);

    const archive = await as(employeeToken).patch(`${base()}/customers/${customer.code}/archive`);
    expect(archive.status).toBe(403);
    expect(DB.customers[0]!.status).toBe('ACTIVE');
  });

  // -------------------------------------------------------------------- create

  it('creates a customer with a backend code and normalized fields', async () => {
    seedAdminOwner();

    const res = await as(adminToken)
      .post(`${base()}/customers`)
      .send({
        firstName: 'Sara',
        lastName: 'Haddad',
        email: '  SARA@Example.COM ',
        phone: '+961 3 123 456',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^CUS-[0-9A-F]{12}$/);
    expect(res.body).toMatchObject({
      firstName: 'Sara',
      lastName: 'Haddad',
      email: 'sara@example.com',
      phone: '+961 3 123 456',
      status: 'ACTIVE',
    });
    expect(DB.customers).toHaveLength(1);

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_CUSTOMER_CREATED');
    expect(audit?.targetCode).toBe(res.body.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
  });

  it('stores blank strings as no value', async () => {
    seedAdminOwner();

    const res = await as(adminToken)
      .post(`${base()}/customers`)
      .send({ firstName: '   ', email: '' });

    expect(res.status).toBe(201);
    expect(res.body.firstName).toBeNull();
    expect(res.body.email).toBeNull();
  });

  it('400 on an invalid email', async () => {
    seedAdminOwner();

    const res = await as(adminToken)
      .post(`${base()}/customers`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(DB.customers).toHaveLength(0);
  });

  // -------------------------------------------------------------------- list

  it('lists only ACTIVE customers, newest first', async () => {
    seedAdminOwner();
    addCustomer(SAHARA.id, { firstName: 'Old', createdAt: new Date('2026-01-01T00:00:00.000Z') });
    addCustomer(SAHARA.id, { firstName: 'Newer', createdAt: new Date('2026-06-01T00:00:00.000Z') });
    addCustomer(SAHARA.id, { firstName: 'Gone', status: 'ARCHIVED' });

    const res = await as(adminToken).get(`${base()}/customers`);

    expect(res.status).toBe(200);
    expect(res.body.map((c: { firstName: string }) => c.firstName)).toEqual(['Newer', 'Old']);
    expect(res.body.map((c: { firstName: string }) => c.firstName)).not.toContain('Gone');
  });

  it('searches by name, email or phone', async () => {
    seedAdminOwner();
    addCustomer(SAHARA.id, { firstName: 'Sara', phone: '+961 3 111 111' });
    addCustomer(SAHARA.id, { firstName: 'Noor', phone: '+962 7 222 222' });
    addCustomer(ATLAS.id, { firstName: 'Sara' });

    const res = await as(adminToken).get(`${base()}/customers?search=sara`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].firstName).toBe('Sara');
  });

  it('never leaks database internals', async () => {
    seedAdminOwner();
    addCustomer(SAHARA.id, { firstName: 'Sara' });

    const res = await as(adminToken).get(`${base()}/customers`);
    const serialized = JSON.stringify(res.body);
    for (const leak of ['passwordHash', 'agencyId', '"id"', 'notes: {']) {
      expect(serialized).not.toContain(leak);
    }
  });

  // ------------------------------------------------------------------ details

  it('reads a customer by code, including archived ones', async () => {
    seedAdminOwner();
    const active = addCustomer(SAHARA.id, { firstName: 'Sara' });
    const archived = addCustomer(SAHARA.id, { firstName: 'Gone', status: 'ARCHIVED' });

    const res = await as(adminToken).get(`${base()}/customers/${archived.code}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(archived.code);
    expect(res.body.status).toBe('ARCHIVED');

    const activeRes = await as(adminToken).get(`${base()}/customers/${active.code}`);
    expect(activeRes.status).toBe(200);
  });

  it('404 for a foreign customer and for an unknown code', async () => {
    seedAdminOwner();
    const foreign = addCustomer(ATLAS.id, { firstName: 'Other' });

    const foreignRes = await as(adminToken).get(`${base()}/customers/${foreign.code}`);
    expect(foreignRes.status).toBe(404);
    expect(foreignRes.body.errorCode).toBe('CUSTOMER_NOT_FOUND');

    const unknown = await as(adminToken).get(`${base()}/customers/CUS-000000000000`);
    expect(unknown.status).toBe(404);
  });

  // -------------------------------------------------------------------- update

  it('updates only the fields the caller sent', async () => {
    seedAdminOwner();
    const customer = addCustomer(SAHARA.id, { firstName: 'Sara', phone: '+961 3 111 111', email: null });

    const res = await as(adminToken)
      .patch(`${base()}/customers/${customer.code}`)
      .send({ phone: '+961 3 999 999' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      firstName: 'Sara',
      phone: '+961 3 999 999',
      email: null,
    });
    expect(DB.auditLog.some((e) => e.action === 'AGENCY_CUSTOMER_UPDATED')).toBe(true);
  });

  it('clears a field with null or a blank string', async () => {
    seedAdminOwner();
    const customer = addCustomer(SAHARA.id, { firstName: 'Sara', phone: '+961 3 111 111' });

    const res = await as(adminToken)
      .patch(`${base()}/customers/${customer.code}`)
      .send({ phone: '' });

    expect(res.body.phone).toBeNull();
  });

  it('normalizes a re-submitted email and rejects a garbage one', async () => {
    seedAdminOwner();
    const customer = addCustomer(SAHARA.id, { email: 'sara@example.com' });

    const ok = await as(adminToken)
      .patch(`${base()}/customers/${customer.code}`)
      .send({ email: 'SARA@EXAMPLE.com' });
    expect(ok.body.email).toBe('sara@example.com');

    const bad = await as(adminToken)
      .patch(`${base()}/customers/${customer.code}`)
      .send({ email: 'nope' });
    expect(bad.status).toBe(400);
    expect(DB.customers[0]!.email).toBe('sara@example.com');
  });

  it('404 when updating a customer of another agency', async () => {
    seedAdminOwner();
    const foreign = addCustomer(ATLAS.id, { firstName: 'Other' });

    const res = await as(adminToken)
      .patch(`${base()}/customers/${foreign.code}`)
      .send({ firstName: 'Changed' });

    expect(res.status).toBe(404);
    expect(DB.customers[0]!.firstName).toBe('Other');
  });

  // ------------------------------------------------------------------ archive

  it('archives a customer and records the audit event', async () => {
    seedAdminOwner();
    const customer = addCustomer(SAHARA.id, { firstName: 'Sara' });

    const res = await as(adminToken).patch(`${base()}/customers/${customer.code}/archive`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_CUSTOMER_ARCHIVED');
    expect(audit?.targetCode).toBe(customer.code);
  });

  it('409 when archiving an already-archived customer', async () => {
    seedAdminOwner();
    const customer = addCustomer(SAHARA.id, { status: 'ARCHIVED' });

    const res = await as(adminToken).patch(`${base()}/customers/${customer.code}/archive`);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('CUSTOMER_ALREADY_ARCHIVED');
  });

  it('404 when archiving a customer of another agency', async () => {
    seedAdminOwner();
    const foreign = addCustomer(ATLAS.id, { firstName: 'Other' });

    const res = await as(adminToken).patch(`${base()}/customers/${foreign.code}/archive`);

    expect(res.status).toBe(404);
    expect(DB.customers[0]!.status).toBe('ACTIVE');
  });

  // --------------------------------------------------------- tenant isolation

  it('cannot act on an agency the caller is not a member of', async () => {
    seedAdminOwner();

    const res = await as(adminToken).get(`${base(ATLAS.code)}/customers`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });
});