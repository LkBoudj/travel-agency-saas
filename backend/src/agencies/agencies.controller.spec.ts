import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { SecurityModule } from '../security/security.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { Prisma } from '../generated/prisma/client.js';
import { AGENCY_ADMIN_SYSTEM_KEY, RBAC_PERMISSION_CATALOG } from '../rbac/rbac.constants.js';
import { AgenciesModule } from './agencies.module.js';

/**
 * Platform Agency API + the ownership foundation it rests on.
 *
 * The in-memory Prisma double models the pieces the database really enforces
 * (one OWNER per agency, an OWNER that is ACTIVE and holds the canonical
 * AGENCY_ADMIN system role) so the service contract can be asserted without a
 * live database. The constraints and deferred triggers themselves are verified
 * directly against PostgreSQL — see the migration
 * `20260918120000_agency_ownership_foundation`.
 */

type RoleRow = {
  id: bigint;
  key: string;
  name: string;
  scope: string;
  agencyId: bigint | null;
  systemKey: string | null;
};

type PermissionRow = { id: bigint; key: string; scope: string };
type LinkRow = { roleId: bigint; permissionId: bigint };
type AssignmentRow = { appUserId: bigint; roleId: bigint };

type AppUserRow = {
  id: bigint;
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
};

type AgencyRow = {
  id: bigint;
  code: string;
  name: string;
  status: string;
  country: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipRow = {
  id: bigint;
  agencyId: bigint;
  appUserId: bigint;
  membershipType: string;
  status: string;
};

type AgencyRoleAssignmentRow = { membershipId: bigint; roleId: bigint };

const NOW = new Date('2026-09-18T09:00:00.000Z');

const admin = {
  id: 1n,
  code: 'USR-ADMIN0000001',
  email: 'admin@mail.com',
  firstName: null,
  lastName: null,
  status: 'ACTIVE',
};

const ownerUser = {
  id: 10n,
  code: 'USR-OWNER0000001',
  email: 'owner@mail.com',
  firstName: 'Amina',
  lastName: 'Haddad',
  status: 'ACTIVE',
};

const employeeUser = {
  id: 11n,
  code: 'USR-EMPLOYEE0001',
  email: 'employee@mail.com',
  firstName: 'Karim',
  lastName: 'Ziani',
  status: 'ACTIVE',
};

const suspendedUser = {
  id: 12n,
  code: 'USR-SUSPENDED001',
  email: 'suspended@mail.com',
  firstName: null,
  lastName: null,
  status: 'SUSPENDED',
};

const DB = {
  nextId: 100n,
  roles: new Map<bigint, RoleRow>(),
  permissions: new Map<bigint, PermissionRow>(),
  links: [] as LinkRow[],
  assignments: [] as AssignmentRow[],
  users: new Map<bigint, AppUserRow>(),
  agencies: new Map<bigint, AgencyRow>(),
  memberships: new Map<bigint, MembershipRow>(),
  agencyRoleAssignments: [] as AgencyRoleAssignmentRow[],
};

function id(): bigint {
  const value = DB.nextId;
  DB.nextId += 1n;
  return value;
}

function addRole(
  key: string,
  name: string,
  scope: string,
  agencyId: bigint | null = null,
  systemKey: string | null = null,
): RoleRow {
  const row: RoleRow = { id: id(), key, name, scope, agencyId, systemKey };
  DB.roles.set(row.id, row);
  return row;
}

function addPermission(key: string, scope = 'PLATFORM'): PermissionRow {
  const row: PermissionRow = { id: id(), key, scope };
  DB.permissions.set(row.id, row);
  return row;
}

/** Simulates a failure inside the provisioning transaction. */
let failMembershipCreate = false;
/** Simulates a failure while creating a NEW owner's identity. */
let failAppUserCreate = false;
/** Password hashes handed to the database, so tests can assert they are hashed. */
const createdPasswordHashes: string[] = [];

function canonicalRole(): RoleRow {
  return [...DB.roles.values()].find((role) => role.systemKey === AGENCY_ADMIN_SYSTEM_KEY)!;
}

function countMembers(agencyId: bigint): number {
  return [...DB.memberships.values()].filter((m) => m.agencyId === agencyId).length;
}

/** Mirrors AGENCY_SELECT / AGENCY_DETAILS_SELECT. */
function projectAgency(agency: AgencyRow, withApplications: boolean) {
  const owner = [...DB.memberships.values()].find(
    (m) => m.agencyId === agency.id && m.membershipType === 'OWNER',
  );
  const user = owner ? DB.users.get(owner.appUserId) : undefined;
  return {
    ...agency,
    members: user
      ? [
          {
            appUser: {
              code: user.code,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              status: user.status,
            },
          },
        ]
      : [],
    _count: { members: countMembers(agency.id) },
    ...(withApplications ? { applications: [] } : {}),
  };
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(
      async ({ where }: { where: { id?: bigint; code?: string; email?: string } }) => {
        for (const user of DB.users.values()) {
          if (where.id !== undefined && user.id === where.id) return user;
          if (where.code !== undefined && user.code === where.code) return user;
          if (where.email !== undefined && user.email === where.email) return user;
        }
        return null;
      },
    ),
    findMany: vi.fn(async ({ where, take }: { where: { OR: Record<string, { contains: string }>[] }; take?: number }) => {
      const term = (Object.values(where.OR[0]!)[0] as { contains: string }).contains.toLowerCase();
      const matches = [...DB.users.values()].filter((user) =>
        [user.firstName, user.lastName, user.email, user.code]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term)),
      );
      return matches.slice(0, take ?? matches.length).map((user) => ({
        code: user.code,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
      }));
    }),
    create: vi.fn(async ({ data }: { data: Record<string, string | null> }) => {
      if (failAppUserCreate) {
        failAppUserCreate = false;
        throw new Error('simulated identity failure');
      }
      // The database enforces a unique email; the double mirrors that with the
      // Prisma error the service maps to the duplicate-account contract.
      for (const user of DB.users.values()) {
        if (user.email === data.email) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: ['email'] },
          });
        }
      }
      const row: AppUserRow = {
        id: id(),
        code: data.code as string,
        email: data.email as string,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        status: 'ACTIVE',
      };
      DB.users.set(row.id, row);
      createdPasswordHashes.push(data.passwordHash as string);
      return { id: row.id, code: row.code };
    }),
  },
  role: {
    findFirst: vi.fn(async ({ where }: { where: { systemKey?: string } }) => {
      for (const role of DB.roles.values()) {
        if (where.systemKey !== undefined && role.systemKey !== where.systemKey) continue;
        return role;
      }
      return null;
    }),
  },
  agency: {
    create: vi.fn(async ({ data }: { data: Partial<AgencyRow> }) => {
      const row: AgencyRow = {
        id: id(),
        code: data.code!,
        name: data.name!,
        status: 'ACTIVE',
        country: data.country ?? null,
        description: data.description ?? null,
        createdAt: NOW,
        updatedAt: NOW,
      };
      DB.agencies.set(row.id, row);
      return { id: row.id, code: row.code };
    }),
    findUnique: vi.fn(
      async ({ where, select }: { where: { code: string }; select?: Record<string, unknown> }) => {
        const agency = [...DB.agencies.values()].find((a) => a.code === where.code);
        if (!agency) return null;
        if (select && Object.keys(select).length === 1 && 'id' in select) {
          return { id: agency.id };
        }
        return projectAgency(agency, select !== undefined && 'applications' in select);
      },
    ),
    findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const status = where?.status as string | undefined;
      return [...DB.agencies.values()]
        .filter((agency) => !status || agency.status === status)
        .map((agency) => projectAgency(agency, false));
    }),
    update: vi.fn(
      async ({ where, data }: { where: { code: string }; data: Partial<AgencyRow> }) => {
        const agency = [...DB.agencies.values()].find((a) => a.code === where.code)!;
        Object.assign(agency, data);
        return agency;
      },
    ),
  },
  agencyMembership: {
    create: vi.fn(async ({ data }: { data: Partial<MembershipRow> }) => {
      if (failMembershipCreate) {
        failMembershipCreate = false;
        throw new Error('simulated membership failure');
      }
      const row: MembershipRow = {
        id: id(),
        agencyId: data.agencyId!,
        appUserId: data.appUserId!,
        membershipType: data.membershipType!,
        status: data.status ?? 'ACTIVE',
      };
      DB.memberships.set(row.id, row);
      return { id: row.id };
    }),
  },
  agencyRoleAssignment: {
    create: vi.fn(async ({ data }: { data: AgencyRoleAssignmentRow }) => {
      DB.agencyRoleAssignments.push(data);
      return data;
    }),
  },
  platformRoleAssignment: {
    findMany: vi.fn(async ({ where }: { where: { appUserId: bigint } }) => {
      return DB.assignments
        .filter((a) => a.appUserId === where.appUserId)
        .map((a) => {
          const role = DB.roles.get(a.roleId)!;
          const rolePermissions = DB.links
            .filter((l) => l.roleId === role.id)
            .map((l) => ({ permission: { key: DB.permissions.get(l.permissionId)!.key } }));
          return { role: { scope: role.scope, permissions: rolePermissions } };
        });
    }),
  },
  /**
   * Interactive transaction double. A thrown error discards every write made
   * inside the callback, mirroring a real ROLLBACK.
   */
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg !== 'function') {
      const ops = arg as Promise<unknown>[];
      for (const op of ops) await op;
      return ops;
    }
    const snapshot = {
      agencies: new Map(DB.agencies),
      memberships: new Map(DB.memberships),
      assignments: [...DB.agencyRoleAssignments],
      users: new Map(DB.users),
    };
    try {
      return await (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    } catch (error) {
      DB.agencies = snapshot.agencies;
      DB.memberships = snapshot.memberships;
      DB.agencyRoleAssignments = snapshot.assignments;
      DB.users = snapshot.users;
      throw error;
    }
  }),
};

function baseline(): void {
  DB.roles.clear();
  DB.permissions.clear();
  DB.links = [];
  DB.assignments = [];
  DB.users.clear();
  DB.agencies.clear();
  DB.memberships.clear();
  DB.agencyRoleAssignments = [];
  DB.nextId = 100n;
  failMembershipCreate = false;
  failAppUserCreate = false;
  createdPasswordHashes.length = 0;

  for (const permission of RBAC_PERMISSION_CATALOG) {
    addPermission(permission.key, permission.scope);
  }

  const platformAdmin = addRole('PLATFORM_ADMIN', 'Platform Admin', 'PLATFORM');
  for (const permission of DB.permissions.values()) {
    if (permission.scope === 'PLATFORM') {
      DB.links.push({ roleId: platformAdmin.id, permissionId: permission.id });
    }
  }
  DB.assignments.push({ appUserId: admin.id, roleId: platformAdmin.id });

  // The canonical global agency role carries the protected system identity;
  // the others are look-alikes that must never satisfy the owner invariant.
  addRole('AGENCY_OWNER', 'Agency Owner', 'AGENCY', null, AGENCY_ADMIN_SYSTEM_KEY);
  addRole('AGENCY_MANAGER', 'Agency Manager', 'AGENCY', null);
  addRole('AGENCY_ADMIN', 'Agency Admin', 'AGENCY', 999n);

  for (const user of [admin, ownerUser, employeeUser, suspendedUser]) {
    DB.users.set(user.id, { ...user });
  }
}

describe('Platform Agency API (lifecycle + ownership foundation)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, SecurityModule, AgenciesModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    adminToken = app.get(JwtService).sign({ sub: admin.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const cookie = (value: string): string => `travel_access_token=${value}`;
  const api = {
    get: (path: string) => request(app.getHttpServer()).get(path).set('Cookie', cookie(adminToken)),
    post: (path: string) =>
      request(app.getHttpServer()).post(path).set('Cookie', cookie(adminToken)),
    patch: (path: string) =>
      request(app.getHttpServer()).patch(path).set('Cookie', cookie(adminToken)),
  };

  async function authorizeOnly(...keys: string[]): Promise<void> {
    DB.links = [];
    DB.assignments = [];
    const limited = addRole('LIMITED', 'Limited', 'PLATFORM');
    for (const permission of DB.permissions.values()) {
      if (keys.includes(permission.key)) {
        DB.links.push({ roleId: limited.id, permissionId: permission.id });
      }
    }
    DB.assignments.push({ appUserId: admin.id, roleId: limited.id });
  }

  /** Creates an agency owned by an account that already exists. */
  async function createAgency(overrides: Record<string, unknown> = {}) {
    return api.post('/v1/agencies').send({
      name: 'Sunshine Travels',
      owner: { type: 'EXISTING', appUserCode: ownerUser.code },
      ...overrides,
    });
  }

  /** Creates an agency whose owner account is created in the same request. */
  async function createAgencyWithNewOwner(owner: Record<string, unknown> = {}) {
    return api.post('/v1/agencies').send({
      name: 'Brand New Travels',
      owner: {
        type: 'NEW',
        email: 'new-owner@mail.com',
        password: 'a-strong-password',
        firstName: 'Nadia',
        lastName: 'Bekkai',
        ...owner,
      },
    });
  }

  // ------------------------------------------------------------------ creation

  describe('Agency creation', () => {
    it('creates the agency with exactly one ACTIVE OWNER holding AGENCY_ADMIN', async () => {
      const res = await createAgency({ country: 'Morocco' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'Sunshine Travels',
        country: 'Morocco',
        status: 'ACTIVE',
        membersCount: 1,
        owner: { code: ownerUser.code, email: ownerUser.email, firstName: 'Amina' },
      });

      expect(DB.agencies.size).toBe(1);
      const agencyId = [...DB.agencies.values()][0]!.id;

      const owners = [...DB.memberships.values()].filter(
        (m) => m.agencyId === agencyId && m.membershipType === 'OWNER',
      );
      expect(owners).toHaveLength(1);
      expect(owners[0]!.status).toBe('ACTIVE');
      expect(owners[0]!.appUserId).toBe(ownerUser.id);

      expect(DB.agencyRoleAssignments).toEqual([
        { membershipId: owners[0]!.id, roleId: canonicalRole().id },
      ]);
    });

    it('resolves the owner role by systemKey, never by key or name', async () => {
      await createAgency();
      const call = prismaMock.role.findFirst.mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where).toEqual({ systemKey: AGENCY_ADMIN_SYSTEM_KEY });
    });

    it('never leaks database ids', async () => {
      const res = await createAgency();
      expect(res.body).not.toHaveProperty('id');
      expect(res.body.owner).not.toHaveProperty('id');
      expect(res.body.code).toMatch(/^AGY-[0-9A-F]{12}$/);
    });

    it('rolls the whole transaction back when a step fails: no orphan agency', async () => {
      failMembershipCreate = true;
      const res = await createAgency();
      expect(res.status).toBe(500);
      expect(DB.agencies.size).toBe(0);
      expect(DB.memberships.size).toBe(0);
      expect(DB.agencyRoleAssignments).toHaveLength(0);
    });

    it('404 OWNER_APP_USER_NOT_FOUND for an unknown owner', async () => {
      const res = await createAgency({
        owner: { type: 'EXISTING', appUserCode: 'USR-DOES-NOT-EXIST' },
      });
      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('OWNER_APP_USER_NOT_FOUND');
      expect(DB.agencies.size).toBe(0);
    });

    it('409 OWNER_APP_USER_NOT_ACTIVE for a suspended owner', async () => {
      const res = await createAgency({
        owner: { type: 'EXISTING', appUserCode: suspendedUser.code },
      });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('OWNER_APP_USER_NOT_ACTIVE');
      expect(DB.agencies.size).toBe(0);
    });

    it('400 AGENCY_ADMIN_ROLE_MISSING when no canonical system role exists', async () => {
      for (const [roleId, role] of DB.roles) {
        if (role.systemKey === AGENCY_ADMIN_SYSTEM_KEY) DB.roles.delete(roleId);
      }
      const res = await createAgency();
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AGENCY_ADMIN_ROLE_MISSING');
      expect(DB.agencies.size).toBe(0);
    });

    it('a custom agency role keyed AGENCY_ADMIN does not satisfy the invariant', async () => {
      // Only the protected identity counts: strip it and the look-alikes remain,
      // but creation must fail rather than fall back to one of them.
      for (const role of DB.roles.values()) {
        if (role.systemKey === AGENCY_ADMIN_SYSTEM_KEY) role.systemKey = null;
      }
      const res = await createAgency();
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AGENCY_ADMIN_ROLE_MISSING');
    });

    it('409 AGENCY_ADMIN_ROLE_INVALID when the canonical role is not global', async () => {
      canonicalRole().agencyId = 999n;
      const res = await createAgency();
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('AGENCY_ADMIN_ROLE_INVALID');
      expect(DB.agencies.size).toBe(0);
    });

    it('409 AGENCY_ADMIN_ROLE_INVALID when the canonical role is not AGENCY-scoped', async () => {
      canonicalRole().scope = 'PLATFORM';
      const res = await createAgency();
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('AGENCY_ADMIN_ROLE_INVALID');
    });

    it('rejects backend-owned fields in the body', async () => {
      const res = await api.post('/v1/agencies').send({
        name: 'X',
        owner: { type: 'EXISTING', appUserCode: ownerUser.code },
        status: 'SUSPENDED',
        code: 'AGY-1',
      });
      expect(res.status).toBe(400);
      expect(DB.agencies.size).toBe(0);
    });

    it('rejects website and domain: they are not part of the agency foundation', async () => {
      // Custom domains belong to a later Agency Settings feature; accepting a
      // value here would silently drop it.
      for (const extra of [
        { website: 'https://sunshine.example' },
        { domain: 'sunshine.example' },
        { customDomain: 'sunshine.example' },
      ]) {
        const res = await createAgency(extra);
        expect(res.status).toBe(400);
      }
      expect(DB.agencies.size).toBe(0);
    });

    it('never exposes a website on the created agency', async () => {
      const res = await createAgency();
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('website');
      expect(res.body).not.toHaveProperty('domain');
    });

    it('403 without PLATFORM_AGENCY_CREATE', async () => {
      await authorizeOnly('PLATFORM_AGENCY_VIEW');
      const res = await createAgency();
      expect(res.status).toBe(403);
    });
  });

  // ------------------------------------------------------------- new owner

  describe('Agency creation with a NEW owner', () => {
    it('creates the account, the agency and the full ownership structure atomically', async () => {
      const usersBefore = DB.users.size;
      const res = await createAgencyWithNewOwner()
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'Brand New Travels',
        membersCount: 1,
        owner: { email: 'new-owner@mail.com', firstName: 'Nadia', lastName: 'Bekkai' },
      });

      expect(DB.users.size).toBe(usersBefore + 1);
      const created = [...DB.users.values()].find((u) => u.email === 'new-owner@mail.com')!;

      const owners = [...DB.memberships.values()].filter(
        (m) => m.membershipType === 'OWNER' && m.appUserId === created.id,
      );
      expect(owners).toHaveLength(1);
      expect(owners[0]!.status).toBe('ACTIVE');
      expect(DB.agencyRoleAssignments).toContainEqual({
        membershipId: owners[0]!.id,
        roleId: canonicalRole().id,
      });
    });

    it('generates the account code with the project convention; the client never sends one', async () => {
      const res = await createAgencyWithNewOwner();
      expect(res.body.owner.code).toMatch(/^USR-[0-9A-F]{12}$/);
    });

    it('stores a hashed password and never returns password material', async () => {
      const res = await createAgencyWithNewOwner();

      expect(createdPasswordHashes).toHaveLength(1);
      const stored = createdPasswordHashes[0]!;
      expect(stored).not.toBe('a-strong-password');
      expect(stored.startsWith('$argon2')).toBe(true);

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('a-strong-password');
      expect(serialized).not.toContain('passwordHash');
    });

    it('gives the new owner NO platform role', async () => {
      const assignmentsBefore = DB.assignments.length;
      await createAgencyWithNewOwner();
      // The owner's only context is the agency membership.
      expect(DB.assignments.length).toBe(assignmentsBefore);
    });

    it('rolls everything back when provisioning fails: no orphan account', async () => {
      const usersBefore = DB.users.size;
      failMembershipCreate = true;

      const res = await createAgencyWithNewOwner();
      expect(res.status).toBe(500);
      expect(DB.users.size).toBe(usersBefore);
      expect(DB.agencies.size).toBe(0);
      expect(DB.memberships.size).toBe(0);
      expect(DB.agencyRoleAssignments).toHaveLength(0);
    });

    it('rolls the agency back when the identity itself fails', async () => {
      failAppUserCreate = true;

      const res = await createAgencyWithNewOwner();
      expect(res.status).toBe(500);
      expect(DB.agencies.size).toBe(0);
      expect(DB.memberships.size).toBe(0);
    });

    it('409 EMAIL_ALREADY_REGISTERED for an address that already has an account', async () => {
      const usersBefore = DB.users.size;
      const res = await createAgencyWithNewOwner({ email: ownerUser.email });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');
      // No duplicate account and no half-created agency.
      expect(DB.users.size).toBe(usersBefore);
      expect(DB.agencies.size).toBe(0);
    });

    it('rejects a password shorter than the identity minimum', async () => {
      const res = await createAgencyWithNewOwner({ password: 'short' });
      expect(res.status).toBe(400);
      expect(DB.agencies.size).toBe(0);
    });

    it('rejects a malformed owner email', async () => {
      const res = await createAgencyWithNewOwner({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('rejects an unknown owner type', async () => {
      const res = await api
        .post('/v1/agencies')
        .send({ name: 'X', owner: { type: 'SOMETHING_ELSE', appUserCode: ownerUser.code } });
      expect(res.status).toBe(400);
    });

    it('never accepts privilege or ownership fields on the owner', async () => {
      for (const extra of [
        { roleKeys: ['AGENCY_OWNER'] },
        { membershipType: 'OWNER' },
        { systemKey: 'AGENCY_ADMIN' },
        { status: 'ACTIVE' },
        { code: 'USR-CLIENT000001' },
      ]) {
        const res = await createAgencyWithNewOwner(extra);
        expect(res.status).toBe(400);
      }
      expect(DB.agencies.size).toBe(0);
    });
  });

  // ------------------------------------------------------------ owner lookup

  describe('Owner lookup (GET /v1/app-users/search)', () => {
    it('finds accounts by name', async () => {
      const res = await api.get('/v1/app-users/search?search=Amina');
      expect(res.status).toBe(200);
      expect(res.body.map((u: { code: string }) => u.code)).toContain(ownerUser.code);
    });

    it('finds accounts by email', async () => {
      const res = await api.get('/v1/app-users/search?search=employee@mail.com');
      expect(res.status).toBe(200);
      expect(res.body[0].code).toBe(employeeUser.code);
    });

    it('finds accounts that hold no platform role at all', async () => {
      // The Platform Users surface would not return these; the owner picker must.
      const res = await api.get('/v1/app-users/search?search=Karim');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns only safe selection data', async () => {
      const res = await api.get('/v1/app-users/search?search=Amina');
      expect(Object.keys(res.body[0]).sort()).toEqual([
        'code',
        'email',
        'firstName',
        'lastName',
        'status',
      ]);
    });

    it('requires a search term of at least two characters', async () => {
      expect((await api.get('/v1/app-users/search')).status).toBe(400);
      expect((await api.get('/v1/app-users/search?search=a')).status).toBe(400);
    });

    it('403 without PLATFORM_AGENCY_CREATE', async () => {
      await authorizeOnly('PLATFORM_AGENCY_VIEW');
      expect((await api.get('/v1/app-users/search?search=Amina')).status).toBe(403);
    });

    it('401 without an auth cookie', async () => {
      const res = await request(app.getHttpServer()).get('/v1/app-users/search?search=Amina');
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------- list / get

  describe('Agency list and details', () => {
    it('derives owner and member count from memberships', async () => {
      await createAgency();
      const agencyId = [...DB.agencies.values()][0]!.id;
      // A second, non-owning member.
      DB.memberships.set(500n, {
        id: 500n,
        agencyId,
        appUserId: employeeUser.id,
        membershipType: 'EMPLOYEE',
        status: 'ACTIVE',
      });

      const res = await api.get('/v1/agencies');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        membersCount: 2,
        owner: { code: ownerUser.code },
      });
    });

    it('an EMPLOYEE holding AGENCY_ADMIN is not reported as the owner', async () => {
      await createAgency();
      const agencyId = [...DB.agencies.values()][0]!.id;
      DB.memberships.set(501n, {
        id: 501n,
        agencyId,
        appUserId: employeeUser.id,
        membershipType: 'EMPLOYEE',
        status: 'ACTIVE',
      });
      DB.agencyRoleAssignments.push({ membershipId: 501n, roleId: canonicalRole().id });

      const res = await api.get('/v1/agencies');
      expect(res.body[0].owner.code).toBe(ownerUser.code);
      expect(res.body[0].owner.code).not.toBe(employeeUser.code);
    });

    it('filters by status', async () => {
      const created = await createAgency();
      await api.patch(`/v1/agencies/${created.body.code}/status`).send({ status: 'SUSPENDED' });

      expect((await api.get('/v1/agencies?status=SUSPENDED')).body).toHaveLength(1);
      expect((await api.get('/v1/agencies?status=ACTIVE')).body).toHaveLength(0);
    });

    it('returns details for a single agency', async () => {
      const created = await createAgency();
      const res = await api.get(`/v1/agencies/${created.body.code}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        code: created.body.code,
        owner: { code: ownerUser.code },
        membersCount: 1,
      });
      expect(res.body).toHaveProperty('applicationId');
    });

    it('404 AGENCY_NOT_FOUND for an unknown code', async () => {
      const res = await api.get('/v1/agencies/AGY-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('AGENCY_NOT_FOUND');
    });

    it('403 without PLATFORM_AGENCY_VIEW', async () => {
      await authorizeOnly('PLATFORM_AGENCY_CREATE');
      expect((await api.get('/v1/agencies')).status).toBe(403);
    });
  });

  // --------------------------------------------------------------- update

  describe('Agency update', () => {
    it('updates descriptive fields', async () => {
      const created = await createAgency();
      const res = await api
        .patch(`/v1/agencies/${created.body.code}`)
        .send({ name: 'Sunshine Tours', description: 'Desert circuits' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Sunshine Tours', description: 'Desert circuits' });
    });

    it('rejects an empty patch', async () => {
      const created = await createAgency();
      const res = await api.patch(`/v1/agencies/${created.body.code}`).send({});
      expect(res.status).toBe(400);
    });

    it('never accepts status or ownership through the profile patch', async () => {
      const created = await createAgency();
      const res = await api
        .patch(`/v1/agencies/${created.body.code}`)
        .send({ status: 'SUSPENDED', ownerAppUserCode: employeeUser.code });
      expect(res.status).toBe(400);
      expect([...DB.agencies.values()][0]!.status).toBe('ACTIVE');
    });

    it('never accepts website or domain through the profile patch', async () => {
      const created = await createAgency();
      for (const patch of [
        { website: 'https://sunshine.example' },
        { domain: 'sunshine.example' },
      ]) {
        const res = await api.patch(`/v1/agencies/${created.body.code}`).send(patch);
        expect(res.status).toBe(400);
      }
    });

    it('never exposes a website on the agency details contract', async () => {
      const created = await createAgency()
      const res = await api.get(`/v1/agencies/${created.body.code}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('website');
      expect(res.body).not.toHaveProperty('domain');

      const list = await api.get('/v1/agencies');
      expect(list.body[0]).not.toHaveProperty('website');
    });

    it('403 without PLATFORM_AGENCY_UPDATE', async () => {
      const created = await createAgency();
      await authorizeOnly('PLATFORM_AGENCY_VIEW');
      const res = await api.patch(`/v1/agencies/${created.body.code}`).send({ name: 'Nope' });
      expect(res.status).toBe(403);
    });
  });

  // --------------------------------------------------------------- status

  describe('Agency status (business, not ownership)', () => {
    it('suspends the agency while the OWNER membership stays ACTIVE', async () => {
      const created = await createAgency();
      const res = await api
        .patch(`/v1/agencies/${created.body.code}/status`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUSPENDED');

      const owner = [...DB.memberships.values()].find((m) => m.membershipType === 'OWNER')!;
      expect(owner.status).toBe('ACTIVE');
      // The owner is still reported, and still holds the canonical role.
      expect(res.body.owner.code).toBe(ownerUser.code);
      expect(DB.agencyRoleAssignments).toHaveLength(1);
    });

    it('reactivates a suspended agency', async () => {
      const created = await createAgency();
      await api.patch(`/v1/agencies/${created.body.code}/status`).send({ status: 'SUSPENDED' });
      const res = await api
        .patch(`/v1/agencies/${created.body.code}/status`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
      expect([...DB.memberships.values()][0]!.status).toBe('ACTIVE');
    });

    it('rejects an unknown status', async () => {
      const created = await createAgency();
      const res = await api
        .patch(`/v1/agencies/${created.body.code}/status`)
        .send({ status: 'ARCHIVED' });
      expect(res.status).toBe(400);
    });

    it('404 for an unknown agency', async () => {
      const res = await api.patch('/v1/agencies/AGY-000000000000/status').send({
        status: 'SUSPENDED',
      });
      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('AGENCY_NOT_FOUND');
    });

    it('403 without PLATFORM_AGENCY_STATUS_MANAGE', async () => {
      const created = await createAgency();
      await authorizeOnly('PLATFORM_AGENCY_VIEW', 'PLATFORM_AGENCY_UPDATE');
      const res = await api
        .patch(`/v1/agencies/${created.body.code}/status`)
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(403);
    });
  });

  // ------------------------------------------------------------ authentication

  it('401 without an auth cookie', async () => {
    const res = await request(app.getHttpServer()).get('/v1/agencies');
    expect(res.status).toBe(401);
  });
});
