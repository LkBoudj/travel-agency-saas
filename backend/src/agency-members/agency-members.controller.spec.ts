import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { Prisma } from '../generated/prisma/client.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { AgencyMembersModule } from './agency-members.module.js';

/**
 * Agency member administration over HTTP, through the real agency
 * authorization guard.
 *
 * The in-memory Prisma double models the pieces the domain depends on: agency
 * status, membership type/status, role scope and ownership, and account status.
 * The cross-tenant trigger that stops a foreign role from ever being written is
 * verified directly against PostgreSQL (see the
 * `agency_role_assignment_scope` migration).
 */

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

const NOW = new Date('2026-09-19T09:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };
const outsider = { id: 3n, code: 'USR-OUTSIDER0001', email: 'outsider@mail.com' };
const suspendedAccount = { id: 4n, code: 'USR-SUSPENDED001', email: 'suspended@mail.com' };
const atlasOwner = { id: 5n, code: 'USR-ATLASOWNER01', email: 'atlas@mail.com' };

const DB = {
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  platformAssignments: [] as Array<{ appUserId: bigint; roleId: bigint }>,
};

let nextId = 100n;
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

function matches(user: UserRow, term: string): boolean {
  const needle = term.toLowerCase();
  return [user.firstName, user.lastName, user.email, user.code]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle));
}

function containsOf(where: unknown): string | undefined {
  const or = (where as { OR?: Array<Record<string, { contains: string }>> } | undefined)?.OR;
  if (!or?.length) return undefined;
  return Object.values(or[0]!)[0]!.contains;
}

function projectMember(m: MembershipRow) {
  const user = DB.users.get(m.appUserId)!;
  return {
    id: m.id,
    membershipType: m.membershipType,
    status: m.status,
    createdAt: m.createdAt,
    appUser: {
      code: user.code,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
    },
    agencyRoleAssignments: m.roleIds.map((roleId) => {
      const role = DB.roles.get(roleId)!;
      return {
        role: { key: role.key, name: role.name, scope: role.scope, agencyId: role.agencyId },
      };
    }),
  };
}

/** Simulates a failure after the identity is created, to prove rollback. */
let failMembershipCreate = false;

const prismaMock = {
  appUser: {
    findUnique: vi.fn(
      async ({
        where,
        select,
      }: {
        where: { id?: bigint; code?: string; email?: string };
        select?: Record<string, unknown>;
      }) => {
        const user = [...DB.users.values()].find(
          (u) =>
            (where.id !== undefined && u.id === where.id) ||
            (where.code !== undefined && u.code === where.code) ||
            (where.email !== undefined && u.email === where.email),
        );
        if (!user) return null;
        return select ? { ...user } : user;
      },
    ),
    findMany: vi.fn(
      async ({ where, take }: { where: unknown; take?: number }) => {
        const term = containsOf(where) ?? '';
        const agencyId = (
          where as { OR?: unknown } & Record<string, unknown>
        ) as unknown as Record<string, never>;
        void agencyId;
        return [...DB.users.values()]
          .filter((u) => matches(u, term))
          .slice(0, take ?? undefined)
          .map((u) => ({ ...u, agencyMemberships: [] as Array<{ id: bigint }> }));
      },
    ),
    create: vi.fn(async ({ data }: { data: Record<string, string> }) => {
      for (const existing of DB.users.values()) {
        if (existing.email === data.email) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: ['email'] },
          });
        }
      }
      const row: UserRow = {
        id: id(),
        code: data.code!,
        email: data.email!,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        status: 'ACTIVE',
        passwordHash: data.passwordHash!,
      };
      DB.users.set(row.id, row);
      return { id: row.id, code: row.code };
    }),
  },
  role: {
    findMany: vi.fn(
      async ({ where }: { where: { key?: { in: string[] }; scope?: string; OR?: unknown[] } }) => {
        let rows = [...DB.roles.values()];
        if (where.key?.in) {
          rows = rows.filter((r) => where.key!.in.includes(r.key));
        }
        if (where.scope) {
          rows = rows.filter((r) => r.scope === where.scope);
        }
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
    findMany: vi.fn(async ({ where }: { where: { agencyId: bigint; appUser?: unknown } }) => {
      const term = containsOf((where.appUser as { is?: unknown })?.is);
      return DB.memberships
        .filter((m) => m.agencyId === where.agencyId)
        .filter((m) => !term || matches(DB.users.get(m.appUserId)!, term))
        .sort((a, b) => a.membershipType.localeCompare(b.membershipType))
        .map(projectMember);
    }),
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; appUser: { is: { code: string } } } }) => {
        const m = DB.memberships.find(
          (row) =>
            row.agencyId === where.agencyId &&
            DB.users.get(row.appUserId)!.code === where.appUser.is.code,
        );
        return m ? projectMember(m) : null;
      },
    ),
    findUnique: vi.fn(
      async ({
        where,
      }: {
        where: { agencyId_appUserId: { agencyId: bigint; appUserId: bigint } };
      }) => {
        const { agencyId, appUserId } = where.agencyId_appUserId;
        const m = DB.memberships.find((r) => r.agencyId === agencyId && r.appUserId === appUserId);
        return m ? { id: m.id } : null;
      },
    ),
    create: vi.fn(async ({ data }: { data: Record<string, string | bigint> }) => {
      if (failMembershipCreate) {
        failMembershipCreate = false;
        throw new Error('simulated membership failure');
      }
      const row = addMembership(data.agencyId as bigint, data.appUserId as bigint, [], {
        membershipType: data.membershipType as string,
        status: data.status as string,
      });
      return { id: row.id };
    }),
    update: vi.fn(
      async ({ where, data }: { where: { id: bigint }; data: { status: string } }) => {
        const m = DB.memberships.find((r) => r.id === where.id)!;
        m.status = data.status;
        return projectMember(m);
      },
    ),
    delete: vi.fn(async ({ where }: { where: { id: bigint } }) => {
      const index = DB.memberships.findIndex((r) => r.id === where.id);
      const [removed] = DB.memberships.splice(index, 1);
      return { id: removed!.id };
    }),
  },
  agencyRoleAssignment: {
    createMany: vi.fn(
      async ({ data }: { data: Array<{ membershipId: bigint; roleId: bigint }> }) => {
        for (const row of data) {
          const m = DB.memberships.find((r) => r.id === row.membershipId)!;
          if (!m.roleIds.includes(row.roleId)) m.roleIds.push(row.roleId);
        }
        return { count: data.length };
      },
    ),
    deleteMany: vi.fn(async ({ where }: { where: { membershipId: bigint } }) => {
      const m = DB.memberships.find((r) => r.id === where.membershipId)!;
      const count = m.roleIds.length;
      m.roleIds = [];
      return { count };
    }),
  },
  platformRoleAssignment: {
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => {
      throw new Error('agency member creation must never touch platform roles');
    }),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg !== 'function') return arg;
    const snapshot = {
      users: new Map(DB.users),
      memberships: DB.memberships.map((m) => ({ ...m, roleIds: [...m.roleIds] })),
    };
    try {
      return await (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    } catch (error) {
      DB.users = snapshot.users;
      DB.memberships = snapshot.memberships;
      throw error;
    }
  }),
};

function baseline(): void {
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.platformAssignments = [];
  nextId = 100n;
  failMembershipCreate = false;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  for (const seed of [admin, employee, outsider, atlasOwner]) addUser(seed);
  addUser(suspendedAccount, 'SUSPENDED');
}

/** Every member permission, so authorization is never the thing under test. */
const ALL_MEMBER_PERMISSIONS = [
  'AGENCY_MEMBER_VIEW',
  'AGENCY_MEMBER_INVITE',
  'AGENCY_MEMBER_UPDATE',
  'AGENCY_MEMBER_REMOVE',
  'AGENCY_MEMBER_ROLE_MANAGE',
];

describe('Agency members API', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        AuthorizationModule,
        AgencyMembersModule,
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
    patch: (p: string) => request(app.getHttpServer()).patch(p).set('Cookie', cookie(token)),
    delete: (p: string) => request(app.getHttpServer()).delete(p).set('Cookie', cookie(token)),
  });

  const base = (code = SAHARA.code) => `/v1/agencies/${code}`;

  /** Makes the caller an owner holding every member permission. */
  function seedAdminOwner(agencyId = SAHARA.id): RoleRow {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ALL_MEMBER_PERMISSIONS, 'Agency Owner');
    addMembership(agencyId, admin.id, [role.id], { membershipType: 'OWNER' });
    return role;
  }

  // ------------------------------------------------------------ authorization

  it('401 without a JWT', async () => {
    expect((await request(app.getHttpServer()).get(`${base()}/members`)).status).toBe(401);
  });

  it('403 without the required member permission', async () => {
    const role = addRole('AGENCY_ACCOUNTANT', 'AGENCY', null, ['AGENCY_PAYMENT_VIEW']);
    addMembership(SAHARA.id, admin.id, [role.id]);

    const res = await as(adminToken).get(`${base()}/members`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('403 when the agency is suspended', async () => {
    seedAdminOwner();
    DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';

    const res = await as(adminToken).get(`${base()}/members`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
  });

  // -------------------------------------------------------------------- list

  it('lists the owner and employees, one row per person', async () => {
    const ownerRole = seedAdminOwner();
    const a = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
    const b = addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, [], 'Tour Manager');
    addMembership(SAHARA.id, employee.id, [a.id, b.id]);
    void ownerRole;

    const res = await as(adminToken).get(`${base()}/members`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const codes = res.body.map((m: { code: string }) => m.code);
    expect(new Set(codes).size).toBe(codes.length);

    const row = res.body.find((m: { code: string }) => m.code === employee.code);
    expect(row.membershipType).toBe('EMPLOYEE');
    expect(row.roles.map((r: { key: string }) => r.key)).toEqual([
      'AGENCY_BOOKING_AGENT',
      'AGENCY_TOUR_MANAGER',
    ]);
  });

  it('lists only this agency, and never leaks internals', async () => {
    seedAdminOwner();
    addMembership(SAHARA.id, employee.id, []);
    addMembership(ATLAS.id, outsider.id, []);

    const res = await as(adminToken).get(`${base()}/members`);
    const codes = res.body.map((m: { code: string }) => m.code);
    expect(codes).not.toContain(outsider.code);

    const serialized = JSON.stringify(res.body);
    for (const leak of ['passwordHash', 'systemKey', 'agencyId', '"id"']) {
      expect(serialized).not.toContain(leak);
    }
  });

  it('searches by name, email or code', async () => {
    seedAdminOwner();
    addMembership(SAHARA.id, employee.id, []);

    const res = await as(adminToken).get(`${base()}/members?search=${employee.email}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].code).toBe(employee.code);
  });

  // ----------------------------------------------------------------- details

  it('returns one member with this agency membership only', async () => {
    seedAdminOwner();
    const role = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
    addMembership(SAHARA.id, employee.id, [role.id]);
    addMembership(ATLAS.id, employee.id, []);

    const res = await as(adminToken).get(`${base()}/members/${employee.code}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: employee.code,
      membershipType: 'EMPLOYEE',
      membershipStatus: 'ACTIVE',
      accountStatus: 'ACTIVE',
    });
    expect(res.body.roles).toEqual([{ key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent' }]);
  });

  it('404 for someone who is a member of another agency only', async () => {
    seedAdminOwner();
    addMembership(ATLAS.id, outsider.id, []);

    const res = await as(adminToken).get(`${base()}/members/${outsider.code}`);
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('AGENCY_MEMBER_NOT_FOUND');
  });

  // ------------------------------------------------------- add existing user

  it('adds an existing account as an ACTIVE EMPLOYEE', async () => {
    seedAdminOwner();
    const role = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: { type: 'EXISTING', appUserCode: employee.code },
        roleKeys: ['AGENCY_BOOKING_AGENT'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      code: employee.code,
      membershipType: 'EMPLOYEE',
      membershipStatus: 'ACTIVE',
    });
    expect(res.body.roles.map((r: { key: string }) => r.key)).toEqual([role.key]);
  });

  it('allows adding with no roles at all', async () => {
    seedAdminOwner();

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({ member: { type: 'EXISTING', appUserCode: employee.code } });

    expect(res.status).toBe(201);
    expect(res.body.roles).toEqual([]);
  });

  it('accepts several roles and deduplicates the keys', async () => {
    seedAdminOwner();
    addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, []);

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: { type: 'EXISTING', appUserCode: employee.code },
        roleKeys: ['AGENCY_BOOKING_AGENT', 'AGENCY_TOUR_MANAGER', 'AGENCY_BOOKING_AGENT'],
      });

    expect(res.status).toBe(201);
    expect(res.body.roles).toHaveLength(2);
  });

  it('409 when the account is already a member here', async () => {
    seedAdminOwner();
    addMembership(SAHARA.id, employee.id, []);

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({ member: { type: 'EXISTING', appUserCode: employee.code } });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('ALREADY_AGENCY_MEMBER');
  });

  it('membership in ANOTHER agency is not a conflict', async () => {
    seedAdminOwner();
    addMembership(ATLAS.id, employee.id, []);

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({ member: { type: 'EXISTING', appUserCode: employee.code } });

    expect(res.status).toBe(201);
    // The Atlas membership is untouched.
    expect(DB.memberships.filter((m) => m.appUserId === employee.id)).toHaveLength(2);
  });

  it('404 for an unknown account, 409 for a suspended one', async () => {
    seedAdminOwner();

    const unknown = await as(adminToken)
      .post(`${base()}/members`)
      .send({ member: { type: 'EXISTING', appUserCode: 'USR-NOPE' } });
    expect(unknown.status).toBe(404);
    expect(unknown.body.errorCode).toBe('MEMBER_APP_USER_NOT_FOUND');

    const suspended = await as(adminToken)
      .post(`${base()}/members`)
      .send({ member: { type: 'EXISTING', appUserCode: suspendedAccount.code } });
    expect(suspended.status).toBe(409);
    expect(suspended.body.errorCode).toBe('MEMBER_APP_USER_NOT_ACTIVE');
  });

  // ------------------------------------------------------------ add new user

  it('creates a new account and its membership atomically', async () => {
    seedAdminOwner();
    addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    const usersBefore = DB.users.size;

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: {
          type: 'NEW',
          email: 'new-employee@mail.com',
          password: 'a-strong-password',
          firstName: 'Nadia',
          lastName: 'Bekkai',
        },
        roleKeys: ['AGENCY_BOOKING_AGENT'],
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^USR-[0-9A-F]{12}$/);
    expect(res.body.membershipType).toBe('EMPLOYEE');
    expect(DB.users.size).toBe(usersBefore + 1);

    const created = [...DB.users.values()].find((u) => u.email === 'new-employee@mail.com')!;
    expect(created.passwordHash.startsWith('$argon2')).toBe(true);
    expect(created.passwordHash).not.toBe('a-strong-password');
    expect(JSON.stringify(res.body)).not.toContain('a-strong-password');
  });

  it('gives a new member no platform role', async () => {
    seedAdminOwner();

    await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: { type: 'NEW', email: 'new2@mail.com', password: 'a-strong-password' },
      });

    expect(prismaMock.platformRoleAssignment.create).not.toHaveBeenCalled();
    expect(DB.platformAssignments).toHaveLength(0);
  });

  it('rolls back the new account when the membership fails', async () => {
    seedAdminOwner();
    const usersBefore = DB.users.size;
    failMembershipCreate = true;

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: { type: 'NEW', email: 'orphan@mail.com', password: 'a-strong-password' },
      });

    expect(res.status).toBe(500);
    expect(DB.users.size).toBe(usersBefore);
  });

  it('409 for a duplicate email', async () => {
    seedAdminOwner();

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: { type: 'NEW', email: employee.email, password: 'a-strong-password' },
      });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects privilege and ownership fields in the body', async () => {
    seedAdminOwner();

    for (const member of [
      { type: 'EXISTING', appUserCode: employee.code, membershipType: 'OWNER' },
      { type: 'EXISTING', appUserCode: employee.code, agencyId: '1' },
      { type: 'EXISTING', appUserCode: employee.code, status: 'ACTIVE' },
      { type: 'NEW', email: 'x@mail.com', password: 'a-strong-password', systemKey: 'AGENCY_ADMIN' },
      { type: 'OWNER', appUserCode: employee.code },
    ]) {
      const res = await as(adminToken).post(`${base()}/members`).send({ member });
      expect(res.status).toBe(400);
    }
  });

  // ------------------------------------------------------------ role scoping

  it('rejects a PLATFORM role and a foreign custom role', async () => {
    seedAdminOwner();
    addRole('PLATFORM_ADMIN', 'PLATFORM', null, []);
    addRole('ATLAS_CUSTOM', 'AGENCY', ATLAS.id, []);

    for (const key of ['PLATFORM_ADMIN', 'ATLAS_CUSTOM']) {
      const res = await as(adminToken)
        .post(`${base()}/members`)
        .send({ member: { type: 'EXISTING', appUserCode: employee.code }, roleKeys: [key] });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('ROLE_NOT_ASSIGNABLE_IN_AGENCY');
    }
  });

  it('accepts this agency own custom role', async () => {
    seedAdminOwner();
    addRole('SAHARA_NIGHT_DESK', 'AGENCY', SAHARA.id, []);

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({
        member: { type: 'EXISTING', appUserCode: employee.code },
        roleKeys: ['SAHARA_NIGHT_DESK'],
      });

    expect(res.status).toBe(201);
    expect(res.body.roles.map((r: { key: string }) => r.key)).toEqual(['SAHARA_NIGHT_DESK']);
  });

  it('400 for an unknown role key', async () => {
    seedAdminOwner();

    const res = await as(adminToken)
      .post(`${base()}/members`)
      .send({ member: { type: 'EXISTING', appUserCode: employee.code }, roleKeys: ['NOPE'] });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('UNKNOWN_AGENCY_ROLE_KEYS');
  });

  // ---------------------------------------------------------- replace roles

  it('replaces the complete role set atomically', async () => {
    seedAdminOwner();
    const a = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, []);
    addMembership(SAHARA.id, employee.id, [a.id]);

    const res = await as(adminToken)
      .put(`${base()}/members/${employee.code}/roles`)
      .send({ roleKeys: ['AGENCY_TOUR_MANAGER'] });

    expect(res.status).toBe(200);
    expect(res.body.roles.map((r: { key: string }) => r.key)).toEqual(['AGENCY_TOUR_MANAGER']);
  });

  it('allows clearing all roles, leaving an ACTIVE member with none', async () => {
    seedAdminOwner();
    const a = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    addMembership(SAHARA.id, employee.id, [a.id]);

    const res = await as(adminToken)
      .put(`${base()}/members/${employee.code}/roles`)
      .send({ roleKeys: [] });

    expect(res.status).toBe(200);
    expect(res.body.roles).toEqual([]);
    expect(res.body.membershipStatus).toBe('ACTIVE');
  });

  it('rejects a foreign role on replacement too, leaving roles untouched', async () => {
    seedAdminOwner();
    const a = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    addRole('ATLAS_CUSTOM', 'AGENCY', ATLAS.id, []);
    const membership = addMembership(SAHARA.id, employee.id, [a.id]);

    const res = await as(adminToken)
      .put(`${base()}/members/${employee.code}/roles`)
      .send({ roleKeys: ['ATLAS_CUSTOM'] });

    expect(res.status).toBe(400);
    expect(membership.roleIds).toEqual([a.id]);
  });

  // ------------------------------------------------------------------ status

  it('suspends and reactivates an employee membership only', async () => {
    seedAdminOwner();
    addMembership(SAHARA.id, employee.id, []);
    addMembership(ATLAS.id, employee.id, []);

    const suspended = await as(adminToken)
      .patch(`${base()}/members/${employee.code}/status`)
      .send({ status: 'SUSPENDED' });
    expect(suspended.status).toBe(200);
    expect(suspended.body.membershipStatus).toBe('SUSPENDED');
    // The account and the other agency are untouched.
    expect(suspended.body.accountStatus).toBe('ACTIVE');
    expect(DB.users.get(employee.id)!.status).toBe('ACTIVE');
    expect(DB.memberships.find((m) => m.agencyId === ATLAS.id)!.status).toBe('ACTIVE');

    const restored = await as(adminToken)
      .patch(`${base()}/members/${employee.code}/status`)
      .send({ status: 'ACTIVE' });
    expect(restored.body.membershipStatus).toBe('ACTIVE');
  });

  it('a suspended membership immediately fails agency authorization with the same JWT', async () => {
    seedAdminOwner();
    const role = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_MEMBER_VIEW']);
    addMembership(SAHARA.id, employee.id, [role.id]);

    expect((await as(employeeToken).get(`${base()}/members`)).status).toBe(200);

    await as(adminToken)
      .patch(`${base()}/members/${employee.code}/status`)
      .send({ status: 'SUSPENDED' });

    const after = await as(employeeToken).get(`${base()}/members`);
    expect(after.status).toBe(403);
    expect(after.body.errorCode).toBe('AGENCY_MEMBERSHIP_INACTIVE');
  });

  // ------------------------------------------------------------------ remove

  it('removes the membership but keeps the account and other memberships', async () => {
    seedAdminOwner();
    const role = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    addMembership(SAHARA.id, employee.id, [role.id]);
    addMembership(ATLAS.id, employee.id, [role.id]);

    const res = await as(adminToken).delete(`${base()}/members/${employee.code}`);
    expect(res.status).toBe(204);

    expect(DB.users.has(employee.id)).toBe(true);
    expect(DB.memberships.filter((m) => m.appUserId === employee.id)).toHaveLength(1);
    expect(DB.memberships.find((m) => m.appUserId === employee.id)!.agencyId).toBe(ATLAS.id);
  });

  // ------------------------------------------------------------------- owner

  it('protects the owner from suspension, removal and role changes', async () => {
    seedAdminOwner();

    const suspend = await as(adminToken)
      .patch(`${base()}/members/${admin.code}/status`)
      .send({ status: 'SUSPENDED' });
    expect(suspend.status).toBe(409);
    expect(suspend.body.errorCode).toBe('OWNER_CANNOT_BE_SUSPENDED');

    const remove = await as(adminToken).delete(`${base()}/members/${admin.code}`);
    expect(remove.status).toBe(409);
    expect(remove.body.errorCode).toBe('OWNER_CANNOT_BE_REMOVED');

    const roles = await as(adminToken)
      .put(`${base()}/members/${admin.code}/roles`)
      .send({ roleKeys: [] });
    expect(roles.status).toBe(409);
    expect(roles.body.errorCode).toBe('OWNER_ROLES_IMMUTABLE');

    // The owner is still intact.
    const owner = DB.memberships.find((m) => m.membershipType === 'OWNER')!;
    expect(owner.status).toBe('ACTIVE');
    expect(owner.roleIds).toHaveLength(1);
  });

  it('still lists and reads the owner', async () => {
    seedAdminOwner();

    const res = await as(adminToken).get(`${base()}/members/${admin.code}`);
    expect(res.status).toBe(200);
    expect(res.body.membershipType).toBe('OWNER');
  });

  // --------------------------------------------------------- tenant isolation

  it('cannot mutate a member of another agency through this agency route', async () => {
    seedAdminOwner();
    addMembership(ATLAS.id, outsider.id, []);

    for (const res of [
      await as(adminToken)
        .patch(`${base()}/members/${outsider.code}/status`)
        .send({ status: 'SUSPENDED' }),
      await as(adminToken).delete(`${base()}/members/${outsider.code}`),
      await as(adminToken).put(`${base()}/members/${outsider.code}/roles`).send({ roleKeys: [] }),
    ]) {
      expect(res.status).toBe(404);
    }

    expect(DB.memberships.find((m) => m.appUserId === outsider.id)!.status).toBe('ACTIVE');
  });

  it('cannot act on an agency the caller is not a member of', async () => {
    seedAdminOwner();
    addMembership(ATLAS.id, atlasOwner.id, [], { membershipType: 'OWNER' });

    const res = await as(adminToken).get(`${base(ATLAS.code)}/members`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });

  // ------------------------------------------------- assignable roles/lookup

  it('lists assignable roles: global plus this agency own, never foreign or platform', async () => {
    seedAdminOwner();
    addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
    addRole('SAHARA_NIGHT_DESK', 'AGENCY', SAHARA.id, [], 'Night Desk');
    addRole('ATLAS_CUSTOM', 'AGENCY', ATLAS.id, [], 'Atlas Custom');
    addRole('PLATFORM_ADMIN', 'PLATFORM', null, [], 'Platform Admin');

    const res = await as(adminToken).get(`${base()}/available-roles`);
    expect(res.status).toBe(200);

    const keys = res.body.map((r: { key: string }) => r.key);
    expect(keys).toContain('AGENCY_BOOKING_AGENT');
    expect(keys).toContain('SAHARA_NIGHT_DESK');
    expect(keys).not.toContain('ATLAS_CUSTOM');
    expect(keys).not.toContain('PLATFORM_ADMIN');
    expect(Object.keys(res.body[0]).sort()).toEqual(['description', 'key', 'name']);
  });

  it('requires a search term for member candidates', async () => {
    seedAdminOwner();

    expect((await as(adminToken).get(`${base()}/member-candidates`)).status).toBe(400);
    expect((await as(adminToken).get(`${base()}/member-candidates?search=a`)).status).toBe(400);

    const ok = await as(adminToken).get(`${base()}/member-candidates?search=employee`);
    expect(ok.status).toBe(200);
    expect(Object.keys(ok.body[0]).sort()).toEqual([
      'alreadyMember',
      'code',
      'email',
      'firstName',
      'lastName',
      'status',
    ]);
  });
});
