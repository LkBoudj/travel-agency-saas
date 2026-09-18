import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { ALL_PLATFORM_PERMISSION_KEYS, RBAC_PERMISSION_CATALOG } from '../rbac/rbac.constants.js';
import { PlatformUsersModule } from './platform-users.module.js';

vi.mock('argon2', () => ({
  hash: vi.fn(async () => 'mock-hashed-password'),
  verify: vi.fn(async (_digest: string, password: string) => password === 'correct-password'),
}));

type RoleRow = {
  id: bigint;
  name: string;
  key: string;
  scope: string;
  agencyId: bigint | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PermissionRow = {
  id: bigint;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  resource: string;
  action: string;
  createdAt: Date;
};

type LinkRow = { roleId: bigint; permissionId: bigint };

type AssignmentRow = {
  appUserId: bigint;
  roleId: bigint;
};

/** Select-shape AppUser row as loaded through PLATFORM_USER_SELECT. */
type PlatformUserViewRow = {
  id: bigint;
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  platformRoleAssignments: Array<{ role: { key: string; name: string; scope: string } }>;
};

const NOW = new Date('2026-09-16T10:00:00.000Z');

const superUser = {
  id: 1n,
  code: 'USR-ABCDEF123456',
  email: 'super@mail.com',
  passwordHash: 'mock-hashed-password',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'ACTIVE',
  createdAt: NOW,
  updatedAt: NOW,
};

const DB = {
  nextId: 50n,
  roles: new Map<bigint, RoleRow>(),
  permissions: new Map<bigint, PermissionRow>(),
  links: [] as LinkRow[],
  assignments: [] as AssignmentRow[],
  /** Platform users + a few non-platform AppUsers, keyed by code. */
  users: new Map<string, PlatformUserViewRow>(),
};

function id(): bigint {
  const value = DB.nextId;
  DB.nextId += 1n;
  return value;
}

function addPermission(key: string, scope = 'PLATFORM'): PermissionRow {
  const row: PermissionRow = {
    id: id(),
    key,
    name: key,
    description: `${key} description`,
    scope,
    resource: key.split('_')[1] ?? 'RESOURCE',
    action: key.split('_').pop() ?? 'ACTION',
    createdAt: NOW,
  };
  DB.permissions.set(row.id, row);
  return row;
}

function addRole(
  name: string,
  scope: string,
  keys: string[] = [],
  agencyId: bigint | null = null,
  key = name,
): RoleRow {
  const row: RoleRow = {
    id: id(),
    name,
    key,
    scope,
    agencyId,
    description: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
  DB.roles.set(row.id, row);
  for (const permissionKey of keys) {
    const permission =
      [...DB.permissions.values()].find((p) => p.key === permissionKey) ??
      addPermission(permissionKey);
    DB.links.push({ roleId: row.id, permissionId: permission.id });
  }
  return row;
}

function addPlatformUser(
  code: string,
  firstName: string,
  lastName: string,
  status = 'ACTIVE',
  roles: Array<{ key: string; name: string; scope?: string }> = [],
  idOverride?: bigint,
): PlatformUserViewRow {
  const row: PlatformUserViewRow = {
    id: idOverride ?? id(),
    code,
    email: `${code.toLowerCase()}@mail.com`,
    firstName,
    lastName,
    status,
    createdAt: NOW,
    updatedAt: NOW,
    platformRoleAssignments: roles.map((role) => ({
      role: { key: role.key, name: role.name, scope: role.scope ?? 'PLATFORM' },
    })),
  };
  DB.users.set(code, row);
  return row;
}

function p2002(target: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: [target] },
  });
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: bigint } }) => {
      if (where.email === superUser.email || where.id === superUser.id) {
        return superUser;
      }
      return null;
    }),
    findFirst: vi.fn(async ({ where }: { where: { code: string; platformRoleAssignments?: unknown } }) => {
      const user = DB.users.get(where.code);
      if (!user) return null;
      const platformFilter = where.platformRoleAssignments as
        | { some?: { role?: { is?: { scope?: string } } } }
        | undefined;
      const requestedScope = platformFilter?.some?.role?.is?.scope;
      if (
        requestedScope === 'PLATFORM' &&
        !user.platformRoleAssignments.some((a) => a.role.scope === 'PLATFORM')
      ) {
        return null;
      }
      return user;
    }),
    findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const platformOnly = where?.platformRoleAssignments as
        | { some?: { role?: { is?: { scope?: string } } } }
        | undefined;
      const scope = platformOnly?.some?.role?.is?.scope;
      if (scope) {
        return [...DB.users.values()].filter((user) =>
          user.platformRoleAssignments.some((a) => a.role.scope === scope),
        );
      }
      return [...DB.users.values()];
    }),
    create: vi.fn(
      async ({
        data,
        select,
      }: {
        data: {
          code: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          passwordHash: string;
        };
        select?: unknown;
      }) => {
        const emailTaken = [...DB.users.values()].some((u) => u.email === data.email);
        if (emailTaken) {
          throw p2002('app_user_email_key');
        }
        const row: PlatformUserViewRow = {
          id: id(),
          code: data.code,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          status: 'ACTIVE',
          createdAt: NOW,
          updatedAt: NOW,
          platformRoleAssignments: [],
        };
        DB.users.set(data.code, row);
        return select ? { id: row.id } : row;
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: { email?: string; firstName?: string | null; lastName?: string | null; status?: string };
      }) => {
        const user = [...DB.users.values()].find((u) => u.id === where.id);
        if (!user) throw new Error('update: not found');
        if (data.email !== undefined) {
          const emailTaken = [...DB.users.values()].some(
            (u) => u.id !== where.id && u.email === data.email,
          );
          if (emailTaken) {
            throw p2002('app_user_email_key');
          }
          user.email = data.email;
        }
        if (data.firstName !== undefined) user.firstName = data.firstName;
        if (data.lastName !== undefined) user.lastName = data.lastName;
        if (data.status !== undefined) user.status = data.status;
        user.updatedAt = NOW;
        return user;
      },
    ),
  },
  platformRoleAssignment: {
    findMany: vi.fn(async ({ where }: { where: { appUserId: bigint } }) => {
      return DB.assignments
        .filter((a) => a.appUserId === where.appUserId)
        .map((a) => {
          const role = DB.roles.get(a.roleId);
          if (!role) return null;
          const rolePermissions = DB.links
            .filter((l) => l.roleId === role.id)
            .map((l) => ({ permission: { key: DB.permissions.get(l.permissionId)!.key } }));
          return { role: { scope: role.scope, permissions: rolePermissions } };
        })
        .filter(Boolean);
    }),
    deleteMany: vi.fn(async ({ where }: { where: { appUserId: bigint } }) => {
      for (const user of DB.users.values()) {
        if (user.id === where.appUserId) {
          user.platformRoleAssignments = [];
        }
      }
      const removed = DB.assignments.filter((a) => a.appUserId === where.appUserId);
      DB.assignments = DB.assignments.filter((a) => a.appUserId !== where.appUserId);
      return { count: removed.length };
    }),
    createMany: vi.fn(async ({ data }: { data: Array<{ appUserId: bigint; roleId: bigint }> }) => {
      for (const item of data) {
        const role = DB.roles.get(item.roleId);
        if (!role) continue;
        const user = [...DB.users.values()].find((u) => u.id === item.appUserId);
        if (!user) continue;
        if (!user.platformRoleAssignments.some((a) => a.role.key === role.key)) {
          user.platformRoleAssignments.push({
            role: { key: role.key, name: role.name, scope: role.scope },
          });
        }
        const exists = DB.assignments.some(
          (a) => a.appUserId === item.appUserId && a.roleId === item.roleId,
        );
        if (!exists) {
          DB.assignments.push({ appUserId: item.appUserId, roleId: item.roleId });
        }
      }
      return { count: data.length };
    }),
  },
  role: {
    findMany: vi.fn(
      async ({
        where,
      }: {
        where?: { key?: { in: string[] }; scope?: string; agencyId?: bigint | null };
      } = {}) => {
        let rows = [...DB.roles.values()];
        if (where?.key?.in) {
          rows = rows.filter((r) => where.key!.in.includes(r.key));
        }
        if (where?.scope) {
          rows = rows.filter((r) => r.scope === where.scope);
        }
        if (where && 'agencyId' in where) {
          rows = rows.filter((r) => r.agencyId === where.agencyId);
        }
        return rows;
      },
    ),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    }
    const ops = arg as Promise<unknown>[];
    for (const op of ops) {
      await op;
    }
    return ops;
  }),
};

const PLATFORM_KEYS = ALL_PLATFORM_PERMISSION_KEYS;

function baseline(): void {
  DB.roles.clear();
  DB.permissions.clear();
  DB.links = [];
  DB.assignments = [];
  DB.users.clear();
  DB.nextId = 50n;

  for (const permission of RBAC_PERMISSION_CATALOG) {
    addPermission(permission.key, permission.scope);
  }

  const admin = addRole('Platform Admin', 'PLATFORM', PLATFORM_KEYS, null, 'PLATFORM_ADMIN');
  DB.assignments.push({ appUserId: superUser.id, roleId: admin.id });
  addRole('Identity Admin', 'PLATFORM', [], null, 'PLATFORM_IDENTITY_ADMIN');
  addRole('Support Agent', 'PLATFORM', [], null, 'PLATFORM_SUPPORT_AGENT');
  addRole('Booking Agent', 'AGENCY', [], null, 'AGENCY_BOOKING_AGENT');
  addRole('Custom Agent', 'AGENCY', [], 7n, 'CUSTOM_AGENT');

  addPlatformUser('USR-ABCDEF123456', 'Ada', 'Lovelace', 'ACTIVE', [
    { key: 'PLATFORM_ADMIN', name: 'Platform Admin' },
  ], 1n);
  addPlatformUser('USR-SUPPORT0001', 'Sam', 'Riley', 'ACTIVE', [
    { key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' },
  ]);
  addPlatformUser('USR-SUSPENDED02', 'Noah', 'Khan', 'SUSPENDED', [
    { key: 'PLATFORM_IDENTITY_ADMIN', name: 'Identity Admin' },
  ]);
  // An AppUser that is only an Agency Member (no PLATFORM assignment) and a
  // role-less AppUser must never surface through the platform users API.
  addPlatformUser('USR-AGENCYONLY', 'Lin', 'Wei', 'ACTIVE', [
    { key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent', scope: 'AGENCY' },
  ]);
  addPlatformUser('USR-ROLESS0001', 'Dot', 'Unknown', 'ACTIVE', []);
}

describe('Platform Users API (list, get, create, update, status, roles)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, PlatformUsersModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    token = app.get(JwtService).sign({ sub: '1' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const cookie = (value: string): string => `travel_access_token=${value}`;
  const withCookie = (req: request.Test): request.Test => req.set('Cookie', cookie(token));
  const api = {
    get: (path: string): request.Test => withCookie(request(app.getHttpServer()).get(path)),
    post: (path: string): request.Test => withCookie(request(app.getHttpServer()).post(path)),
    patch: (path: string): request.Test => withCookie(request(app.getHttpServer()).patch(path)),
    put: (path: string): request.Test => withCookie(request(app.getHttpServer()).put(path)),
  };

  async function authorizeOnly(...keys: string[]): Promise<void> {
    DB.roles.clear();
    DB.permissions.clear();
    DB.links = [];
    DB.assignments = [];
    DB.nextId = 200n;
    for (const key of keys) addPermission(key);
    const limited = addRole('LIMITED', 'PLATFORM', keys);
    DB.assignments.push({ appUserId: superUser.id, roleId: limited.id });
  }

  describe('Authorization', () => {
    it('401 without an auth cookie', async () => {
      const res = await request(app.getHttpServer()).get('/v1/platform-users');
      expect(res.status).toBe(401);
    });

    it('403 without PLATFORM_USER_VIEW on the list', async () => {
      await authorizeOnly('PLATFORM_USER_ROLE_VIEW');
      const res = await api.get('/v1/platform-users');
      expect(res.status).toBe(403);
    });

    it('403 without PLATFORM_USER_CREATE on create', async () => {
      await authorizeOnly('PLATFORM_USER_VIEW');
      const res = await api.post('/v1/platform-users').send({
        email: 'new@mail.com',
        password: 'secret123',
        roleKeys: ['PLATFORM_ADMIN'],
      });
      expect(res.status).toBe(403);
    });

    it('403 without PLATFORM_USER_UPDATE on profile edit', async () => {
      await authorizeOnly('PLATFORM_USER_VIEW');
      const res = await api.patch('/v1/platform-users/USR-SUPPORT0001').send({ lastName: 'X' });
      expect(res.status).toBe(403);
    });

    it('403 without PLATFORM_USER_DISABLE on status change', async () => {
      await authorizeOnly('PLATFORM_USER_VIEW');
      const res = await api
        .patch('/v1/platform-users/USR-SUPPORT0001/status')
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(403);
    });

    it('403 without PLATFORM_USER_ROLE_VIEW on role listing', async () => {
      await authorizeOnly('PLATFORM_USER_VIEW');
      const res = await api.get('/v1/platform-users/USR-SUPPORT0001/roles');
      expect(res.status).toBe(403);
    });

    it('403 without PLATFORM_USER_ROLE_MANAGE on role replacement', async () => {
      await authorizeOnly('PLATFORM_USER_ROLE_VIEW');
      const res = await api
        .put('/v1/platform-users/USR-SUPPORT0001/roles')
        .send({ roleKeys: ['PLATFORM_ADMIN'] });
      expect(res.status).toBe(403);
    });
  });

  describe('List', () => {
    it('lists only AppUsers that hold at least one PLATFORM role assignment', async () => {
      const res = await api.get('/v1/platform-users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const codes = res.body.map((u: PlatformUserViewRow) => u.code);
      expect(codes).toContain('USR-ABCDEF123456');
      expect(codes).toContain('USR-SUPPORT0001');
      expect(codes).toContain('USR-SUSPENDED02');
      expect(codes).not.toContain('USR-AGENCYONLY');
      expect(codes).not.toContain('USR-ROLESS0001');
    });

    it('never includes passwordHash, id or JWT material in the response', async () => {
      const res = await api.get('/v1/platform-users');
      expect(res.status).toBe(200);
      for (const user of res.body as Array<Record<string, unknown>>) {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('id');
        expect(user).not.toHaveProperty('emailScope');
      }
      const support = (res.body as Array<Record<string, unknown>>).find(
        (u) => u.code === 'USR-SUPPORT0001',
      );
      expect(support).toMatchObject({
        code: 'USR-SUPPORT0001',
        email: 'usr-support0001@mail.com',
        firstName: 'Sam',
        lastName: 'Riley',
        status: 'ACTIVE',
        roles: [{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }],
      });
    });

    it('forwards a case-insensitive search across code, email, first name and last name', async () => {
      await api.get('/v1/platform-users?search=support');
      const call = prismaMock.appUser.findMany.mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { code: { contains: 'support', mode: 'insensitive' } },
        { email: { contains: 'support', mode: 'insensitive' } },
        { firstName: { contains: 'support', mode: 'insensitive' } },
        { lastName: { contains: 'support', mode: 'insensitive' } },
      ]);
    });

    it('rejects an oversized search query', async () => {
      const res = await api.get(`/v1/platform-users?search=${'x'.repeat(101)}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Get by code', () => {
    it('returns a single platform user with its assigned roles', async () => {
      const res = await api.get('/v1/platform-users/USR-SUPPORT0001');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        code: 'USR-SUPPORT0001',
        status: 'ACTIVE',
        roles: [{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }],
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('404 for an unknown code', async () => {
      const res = await api.get('/v1/platform-users/USR-NOPE00001');
      expect(res.status).toBe(404);
    });

    it('404 for an AppUser that is only an agency member', async () => {
      const res = await api.get('/v1/platform-users/USR-AGENCYONLY');
      expect(res.status).toBe(404);
    });

    it('404 for a role-less AppUser', async () => {
      const res = await api.get('/v1/platform-users/USR-ROLESS0001');
      expect(res.status).toBe(404);
    });
  });

  describe('Create', () => {
    it('creates a platform user atomically with its initial roles (never returns passwordHash)', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'New.Support@Mail.com',
        password: 'secret123',
        firstName: 'Alan',
        lastName: 'Turing',
        roleKeys: ['PLATFORM_SUPPORT_AGENT'],
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        code: expect.stringMatching(/^USR-[0-9A-F]{12}$/),
        email: 'new.support@mail.com',
        firstName: 'Alan',
        lastName: 'Turing',
        status: 'ACTIVE',
        roles: [{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }],
      });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('id');

      const createData = prismaMock.appUser.create.mock.calls[0][0].data;
      expect(createData.passwordHash).toBe('mock-hashed-password');
      expect(createData.passwordHash).not.toBe('secret123');
      const createManyData = prismaMock.platformRoleAssignment.createMany.mock.calls[0][0].data;
      expect(createManyData).toHaveLength(1);
    });

    it('rejects the backend-owned fields code, status and scope', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'sneaky@mail.com',
        password: 'secret123',
        firstName: 'Sam',
        lastName: 'Riley',
        roleKeys: ['PLATFORM_SUPPORT_AGENT'],
        code: 'USR-SNEKY0001',
        status: 'SUSPENDED',
        scope: 'AGENCY',
      });
      expect(res.status).toBe(400);
      expect(prismaMock.appUser.create).not.toHaveBeenCalled();
    });

    it('rejects status and passwordHash even when spread inside a nested object', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'sneaky2@mail.com',
        password: 'secret123',
        roleKeys: ['PLATFORM_SUPPORT_AGENT'],
        passwordHash: 'mao-hashed',
      });
      expect(res.status).toBe(400);
    });

    it('400 without any roleKeys (a platform user always needs at least one role)', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'noroles@mail.com',
        password: 'secret123',
      });
      expect(res.status).toBe(400);
    });

    it('400 when a role key is not uppercase snake case', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'badauth@mail.com',
        password: 'secret123',
        roleKeys: ['lower_case'],
      });
      expect(res.status).toBe(400);
    });

    it('400 with AGENCY_ROLE_NOT_ASSIGNABLE when an AGENCY role key is provided', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'agency@mail.com',
        password: 'secret123',
        roleKeys: ['PLATFORM_SUPPORT_AGENT', 'AGENCY_BOOKING_AGENT'],
      });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AGENCY_ROLE_NOT_ASSIGNABLE');
      expect(res.body.roleKeys).toEqual(['AGENCY_BOOKING_AGENT']);
      expect(prismaMock.appUser.create).not.toHaveBeenCalled();
    });

    it('400 with UNKNOWN_PLATFORM_ROLE_KEYS for a key that does not exist anywhere', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'unknown@mail.com',
        password: 'secret123',
        roleKeys: ['DOES_NOT_EXIST'],
      });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('UNKNOWN_PLATFORM_ROLE_KEYS');
      expect(res.body.unknownKeys).toEqual(['DOES_NOT_EXIST']);
      expect(prismaMock.appUser.create).not.toHaveBeenCalled();
    });

    it('deduplicates repeated roleKeys', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'multi@mail.com',
        password: 'secret123',
        roleKeys: ['PLATFORM_SUPPORT_AGENT', 'PLATFORM_IDENTITY_ADMIN'],
      });
      expect(res.status).toBe(201);
      const roles = res.body.roles as Array<{ key: string }>;
      expect(roles.map((r) => r.key).sort()).toEqual([
        'PLATFORM_IDENTITY_ADMIN',
        'PLATFORM_SUPPORT_AGENT',
      ]);

      const dupes = await api.post('/v1/platform-users').send({
        email: 'dupe@mail.com',
        password: 'secret123',
        roleKeys: ['PLATFORM_SUPPORT_AGENT', 'PLATFORM_SUPPORT_AGENT'],
      });
      expect(dupes.status).toBe(201);
      expect((dupes.body.roles as Array<{ key: string }>).map((r) => r.key)).toEqual([
        'PLATFORM_SUPPORT_AGENT',
      ]);
    });

    it('409 EMAIL_ALREADY_REGISTERED on a duplicate email', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'usr-support0001@mail.com',
        password: 'secret123',
        roleKeys: ['PLATFORM_SUPPORT_AGENT'],
      });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('rejects an invalid email shape with 400', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'not-an-email',
        password: 'secret123',
        roleKeys: ['PLATFORM_SUPPORT_AGENT'],
      });
      expect(res.status).toBe(400);
    });

    it('rejects a password shorter than 8 characters', async () => {
      const res = await api.post('/v1/platform-users').send({
        email: 'shortpw@mail.com',
        password: 'short',
        roleKeys: ['PLATFORM_SUPPORT_AGENT'],
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Update profile', () => {
    it('updates email, firstName and lastName only', async () => {
      const res = await api.patch('/v1/platform-users/USR-SUPPORT0001').send({
        email: 'Renamed.User@Mail.com',
        firstName: 'Renamed',
        lastName: null,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        code: 'USR-SUPPORT0001',
        email: 'renamed.user@mail.com',
        firstName: 'Renamed',
        lastName: null,
        roles: [{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }],
      });
    });

    it('400 for an empty body (nothing to update)', async () => {
      const res = await api.patch('/v1/platform-users/USR-SUPPORT0001').send({});
      expect(res.status).toBe(400);
    });

    it('rejects attempts to mutate code, status, password and roles through the profile endpoint', async () => {
      const before = await api.get('/v1/platform-users/USR-SUPPORT0001');

      const res = await api.patch('/v1/platform-users/USR-SUPPORT0001').send({
        code: 'USR-HACKED001',
        status: 'SUSPENDED',
        password: 'newsecret',
        roleKeys: ['PLATFORM_ADMIN'],
      });
      expect(res.status).toBe(400);

      const after = await api.get('/v1/platform-users/USR-SUPPORT0001');
      expect(after.body).toEqual(before.body);
    });

    it('404 for an unknown code', async () => {
      const res = await api.patch('/v1/platform-users/USR-NOPE00001').send({ firstName: 'X' });
      expect(res.status).toBe(404);
    });

    it('409 EMAIL_ALREADY_REGISTERED when emailing collides with another AppUser', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-SUPPORT0001')
        .send({ email: 'usr-abcdef123456@mail.com' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');
    });
  });

  describe('Status', () => {
    it('suspends an active user', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-SUPPORT0001/status')
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUSPENDED');
    });

    it('reactivates a suspended user', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-SUSPENDED02/status')
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('400 CANNOT_SUSPEND_OWN_ACCOUNT when a user suspends their own account', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-ABCDEF123456/status')
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('CANNOT_SUSPEND_OWN_ACCOUNT');
    });

    it('accepts an idempotent reactivation of an already active account', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-SUPPORT0001/status')
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('400 for an unknown status value', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-SUPPORT0001/status')
        .send({ status: 'BANNED' });
      expect(res.status).toBe(400);
    });

    it('404 for an unknown code', async () => {
      const res = await api
        .patch('/v1/platform-users/USR-NOPE00001/status')
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(404);
    });
  });

  describe('Role management', () => {
    it('returns the current role assignments sorted by name', async () => {
      const res = await api.get('/v1/platform-users/USR-SUPPORT0001/roles');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }]);
    });

    it('404 for an unknown code', async () => {
      const res = await api.get('/v1/platform-users/USR-NOPE00001/roles');
      expect(res.status).toBe(404);
    });

    it('replaces the full assignment set atomically', async () => {
      const res = await api.put('/v1/platform-users/USR-SUPPORT0001/roles').send({
        roleKeys: ['PLATFORM_ADMIN', 'PLATFORM_IDENTITY_ADMIN'],
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        code: 'USR-SUPPORT0001',
        roles: expect.arrayContaining([
          { key: 'PLATFORM_ADMIN', name: 'Platform Admin' },
          { key: 'PLATFORM_IDENTITY_ADMIN', name: 'Identity Admin' },
        ]),
      });

      const after = await api.get('/v1/platform-users/USR-SUPPORT0001/roles');
      expect((after.body as Array<{ key: string }>).map((r) => r.key).sort()).toEqual([
        'PLATFORM_ADMIN',
        'PLATFORM_IDENTITY_ADMIN',
      ]);
    });

    it('400 with AGENCY_ROLE_NOT_ASSIGNABLE on replace and keeps existing assignments', async () => {
      const before = await api.get('/v1/platform-users/USR-SUPPORT0001/roles');

      const res = await api.put('/v1/platform-users/USR-SUPPORT0001/roles').send({
        roleKeys: ['AGENCY_BOOKING_AGENT', 'PLATFORM_ADMIN'],
      });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AGENCY_ROLE_NOT_ASSIGNABLE');

      const after = await api.get('/v1/platform-users/USR-SUPPORT0001/roles');
      expect(after.body).toEqual(before.body);
    });

    it("400 UNKNOWN_PLATFORM_ROLE_KEYS when a replacement key doesn't exist", async () => {
      const res = await api.put('/v1/platform-users/USR-SUPPORT0001/roles').send({
        roleKeys: ['PLATFORM_ADMIN', 'NOT_A_ROLE'],
      });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('UNKNOWN_PLATFORM_ROLE_KEYS');
      expect(res.body.unknownKeys).toEqual(['NOT_A_ROLE']);
    });

    it('400 when an empty roleKeys array would orphan the user', async () => {
      const res = await api.put('/v1/platform-users/USR-SUPPORT0001/roles').send({ roleKeys: [] });
      expect(res.status).toBe(400);

      const after = await api.get('/v1/platform-users/USR-SUPPORT0001/roles');
      expect(after.body).toEqual([{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }]);
    });

    it('404 for an unknown code on replace', async () => {
      const res = await api
        .put('/v1/platform-users/USR-NOPE00001/roles')
        .send({ roleKeys: ['PLATFORM_ADMIN'] });
      expect(res.status).toBe(404);
    });
  });
});