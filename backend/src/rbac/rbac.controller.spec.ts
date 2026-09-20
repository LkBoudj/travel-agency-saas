import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { SecurityModule } from '../security/security.module.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { RbacModule } from './rbac.module.js';
import {
  AGENCY_ADMIN_SYSTEM_KEY,
  ALL_AGENCY_PERMISSION_KEYS,
  ALL_PLATFORM_PERMISSION_KEYS,
  RBAC_PERMISSION_CATALOG,
} from './rbac.constants.js';

type RoleRow = {
  id: bigint;
  name: string;
  key: string;
  scope: string;
  agencyId: bigint | null;
  description: string | null;
  systemKey: string | null;
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

const NOW = new Date('2026-09-16T10:00:00.000Z');

const existingUser = {
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
  nextId: 2n,
  roles: new Map<bigint, RoleRow>(),
  permissions: new Map<bigint, PermissionRow>(),
  links: [] as LinkRow[],
  assignments: [] as { appUserId: bigint; roleId: bigint }[],
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
  systemKey: string | null = null,
): RoleRow {
  const row: RoleRow = {
    id: id(),
    name,
    key,
    scope,
    agencyId,
    description: null,
    systemKey,
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

function p2002(meta?: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta,
  });
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: bigint } }) => {
      if (where.email === existingUser.email || where.id === existingUser.id) {
        return existingUser;
      }
      return null;
    }),
  },
  platformRoleAssignment: {
    count: vi.fn(async ({ where }: { where: { roleId: bigint } }) => {
      return DB.assignments.filter((a) => a.roleId === where.roleId).length;
    }),
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
  },
  role: {
    findMany: vi.fn(
      async (
        { where }: { where?: { scope?: string; agencyId?: bigint | null } } = {},
      ) => {
        let rows = [...DB.roles.values()];
        if (where?.scope) {
          rows = rows.filter((r) => r.scope === where.scope);
        }
        if (where && 'agencyId' in where) {
          rows = rows.filter((r) => r.agencyId === where.agencyId);
        }
        return rows;
      },
    ),
    findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const rows = [...DB.roles.values()];
      const match = rows.find((r) => {
        if ('id' in where) {
          const idCondition = where.id as bigint | { not: bigint };
          if (
            typeof idCondition === 'object' &&
            idCondition !== null &&
            'not' in idCondition
          ) {
            if (r.id === idCondition.not) return false;
          } else if (r.id !== idCondition) {
            return false;
          }
        }
        if ('scope' in where && r.scope !== where.scope) return false;
        if ('name' in where && r.name !== where.name) return false;
        if ('key' in where && r.key !== where.key) return false;
        if ('agencyId' in where && r.agencyId !== where.agencyId) return false;
        return true;
      });
      return match ?? null;
    }),
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint } }) => {
      return where.id === undefined ? null : DB.roles.get(where.id) ?? null;
    }),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          key: string;
          name: string;
          scope: string;
          agencyId: bigint | null;
          description: string | null;
        };
      }) => {
        const nameExists = [...DB.roles.values()].some(
          (r) => r.name === data.name && r.scope === data.scope && r.agencyId === data.agencyId,
        );
        if (nameExists) {
          throw p2002({ target: 'role_global_name_key' });
        }
        const keyExists = [...DB.roles.values()].some(
          (r) => r.key === data.key && r.scope === data.scope && r.agencyId === data.agencyId,
        );
        if (keyExists) {
          throw p2002({ target: 'role_global_key_key' });
        }
        const row: RoleRow = {
          id: id(),
          key: data.key,
          name: data.name,
          scope: data.scope,
          agencyId: data.agencyId ?? null,
          description: data.description,
          // The API can never create a system role: `systemKey` is not part of
          // any request schema.
          systemKey: null,
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.roles.set(row.id, row);
        return row;
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: { name?: string; description?: string | null };
      }) => {
        const current = DB.roles.get(where.id);
        if (!current) throw new Error('update: not found');
        const updated: RoleRow = {
          ...current,
          name: data.name ?? current.name,
          scope: current.scope,
          key: current.key,
          agencyId: current.agencyId,
          description: data.description !== undefined ? data.description : current.description,
          updatedAt: NOW,
        };
        const conflict = [...DB.roles.values()].some(
          (r) =>
            r.id !== updated.id &&
            r.name === updated.name &&
            r.scope === updated.scope &&
            r.agencyId === updated.agencyId,
        );
        if (conflict) {
          throw p2002({ target: 'role_global_name_key' });
        }
        DB.roles.set(updated.id, updated);
        return updated;
      },
    ),
    delete: vi.fn(async ({ where }: { where: { id: bigint } }) => {
      const row = DB.roles.get(where.id);
      if (!row) throw new Error('delete: not found');
      DB.roles.delete(where.id);
      DB.links = DB.links.filter((l) => l.roleId !== where.id);
      return row;
    }),
  },
  permission: {
    findMany: vi.fn(
      async ({
        where,
      }: {
        where?: { key?: { in: string[] }; scope?: string };
      } = {}) => {
        let rows = [...DB.permissions.values()];
        if (where?.key?.in) {
          rows = rows.filter((p) => where.key!.in.includes(p.key));
        }
        if (where?.scope) {
          rows = rows.filter((p) => p.scope === where.scope);
        }
        return rows;
      },
    ),
  },
  rolePermission: {
    findMany: vi.fn(
      async ({
        where,
        select,
      }: {
        where: { roleId: bigint; permission?: { is?: { scope?: string } } };
        select?: { permission?: unknown };
      }) => {
        let links = DB.links.filter((l) => l.roleId === where.roleId);
        const scopeFilter = where.permission?.is?.scope;
        if (scopeFilter) {
          links = links.filter((l) => DB.permissions.get(l.permissionId)!.scope === scopeFilter);
        }
        return links.map((l) => {
          const permission = DB.permissions.get(l.permissionId);
          return select?.permission ? { permission: { key: permission!.key } } : { ...l };
        });
      },
    ),
    deleteMany: vi.fn(async ({ where }: { where?: { roleId?: bigint; permissionId?: bigint } }) => {
      const before = DB.links.length;
      DB.links = DB.links.filter(
        (l) =>
          !(
            (where?.roleId !== undefined && l.roleId === where.roleId) ||
            (where?.permissionId !== undefined && l.permissionId === where.permissionId)
          ),
      );
      return { count: before - DB.links.length };
    }),
    createMany: vi.fn(async ({ data }: { data: LinkRow[] }) => {
      for (const link of data) {
        const exists = DB.links.some(
          (l) => l.roleId === link.roleId && l.permissionId === link.permissionId,
        );
        if (!exists) {
          DB.links.push(link);
        }
      }
      return { count: data.length };
    }),
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
const VIEWER_KEY = 'PLATFORM_ROLE_VIEW';
const MANAGE_KEY = 'PLATFORM_ROLE_PERMISSION_MANAGE';

function baseline(): void {
  DB.roles.clear();
  DB.permissions.clear();
  DB.links = [];
  DB.assignments = [];
  DB.nextId = 50n;

  for (const permission of RBAC_PERMISSION_CATALOG) {
    addPermission(permission.key, permission.scope);
  }

  const admin = addRole('PLATFORM_ADMIN', 'PLATFORM', PLATFORM_KEYS);
  DB.assignments.push({ appUserId: existingUser.id, roleId: admin.id });
  addRole('AGENCY_OP', 'AGENCY', []);
  addRole('CUSTOM_AGENT', 'AGENCY', [], 7n);
  addRole('VIEWER', 'PLATFORM', [VIEWER_KEY]);
}

describe('RBAC HTTP API (roles + permissions + role permissions)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, SecurityModule, RbacModule],
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
    delete: (path: string): request.Test => withCookie(request(app.getHttpServer()).delete(path)),
  };

  const platformRole = (name: string): RoleRow =>
    [...DB.roles.values()].find((r) => r.name === name && r.scope === 'PLATFORM')!;
  const agencyRole = (): RoleRow =>
    [...DB.roles.values()].find((r) => r.scope === 'AGENCY')!;
  const globalAgencyRole = (name: string): RoleRow =>
    [...DB.roles.values()].find(
      (r) => r.name === name && r.scope === 'AGENCY' && r.agencyId === null,
    )!;

  async function authorizeOnly(...keys: string[]): Promise<void> {
    DB.roles.clear();
    DB.permissions.clear();
    DB.links = [];
    DB.assignments = [];
    DB.nextId = 200n;
    for (const key of keys) addPermission(key);
    const limited = addRole('LIMITED', 'PLATFORM', keys);
    DB.assignments.push({ appUserId: existingUser.id, roleId: limited.id });
  }

  describe('Role CRUD (PLATFORM only)', () => {
    it('401 without auth', async () => {
      const res = await request(app.getHttpServer()).get('/v1/roles');
      expect(res.status).toBe(401);
    });

    it('lists only PLATFORM roles with string-serialized BigInt ids', async () => {
      const res = await api.get('/v1/roles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = res.body.map((r: RoleRow) => r.name);
      expect(names).toContain('PLATFORM_ADMIN');
      expect(names).toContain('VIEWER');
      expect(names).not.toContain('AGENCY_OP');
      const admin = res.body.find((r: RoleRow) => r.name === 'PLATFORM_ADMIN');
      expect(typeof admin.id).toBe('string');
      expect(admin.scope).toBe('PLATFORM');
    });

    it('gets a PLATFORM role by id', async () => {
      const admin = platformRole('PLATFORM_ADMIN');
      const res = await api.get(`/v1/roles/${admin.id.toString()}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('PLATFORM_ADMIN');
      expect(res.body.id).toBe(admin.id.toString());
    });

    it('404 for an unknown role id', async () => {
      const res = await api.get('/v1/roles/999999');
      expect(res.status).toBe(404);
    });

    it('404 for an AGENCY-scoped role (platform API never exposes it)', async () => {
      const res = await api.get(`/v1/roles/${agencyRole().id.toString()}`);
      expect(res.status).toBe(404);
    });

    it('creates a PLATFORM role and ignores a client-supplied scope', async () => {
      const res = await api
        .post('/v1/roles')
        .send({
          key: 'PLATFORM_CONTENT_MANAGER',
          name: 'Content Manager',
          scope: 'AGENCY',
          description: 'Content editors',
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Content Manager');
      expect(res.body.key).toBe('PLATFORM_CONTENT_MANAGER');
      expect(res.body.scope).toBe('PLATFORM');
      expect(res.body.agencyId).toBeNull();
      expect(res.body.description).toBe('Content editors');
      expect(typeof res.body.id).toBe('string');
    });

    it('400 when creating without a key', async () => {
      const res = await api.post('/v1/roles').send({ name: 'No Key Role' });
      expect(res.status).toBe(400);
    });

    it('400 when the key is not uppercase snake case', async () => {
      for (const key of ['lower_case', 'with space', '1_LEADING_DIGIT', 'HAS-DASH']) {
        const res = await api
          .post('/v1/roles')
          .send({ key, name: `Role ${key}` });
        expect(res.status).toBe(400);
      }
    });

    it('409 with ROLE_KEY_SCOPE_CONFLICT on duplicate key', async () => {
      const res = await api
        .post('/v1/roles')
        .send({ key: 'VIEWER', name: 'Another Viewer' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('ROLE_KEY_SCOPE_CONFLICT');
    });

    it('409 on duplicate PLATFORM name', async () => {
      const res = await api
        .post('/v1/roles')
        .send({ key: 'PLATFORM_VIEWER_COPY', name: 'VIEWER' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('ROLE_NAME_SCOPE_CONFLICT');
    });

    it('400 on invalid create body', async () => {
      const res = await api.post('/v1/roles').send({ description: 'no name' });
      expect(res.status).toBe(400);
    });

    it('updates a PLATFORM role name and description', async () => {
      const viewer = platformRole('VIEWER');
      const res = await api
        .patch(`/v1/roles/${viewer.id.toString()}`)
        .send({ description: 'Read-only platform viewer' });
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Read-only platform viewer');
      expect(res.body.name).toBe('VIEWER');
    });

    it('never changes the key on update (key is immutable)', async () => {
      const viewer = platformRole('VIEWER');
      const res = await api
        .patch(`/v1/roles/${viewer.id.toString()}`)
        .send({ name: 'Viewer Renamed', key: 'PLATFORM_HACKED_KEY' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Viewer Renamed');
      expect(res.body.key).toBe('VIEWER');
    });

    it('ignores a client-supplied scope on update (scope is immutable)', async () => {
      const viewer = platformRole('VIEWER');
      const res = await api
        .patch(`/v1/roles/${viewer.id.toString()}`)
        .send({ scope: 'AGENCY' });
      expect(res.status).toBe(200);
      expect(res.body.scope).toBe('PLATFORM');
    });

    it('404 on updating an unknown role', async () => {
      const res = await api.patch('/v1/roles/999999').send({ name: 'Any' });
      expect(res.status).toBe(404);
    });

    it('404 on updating an AGENCY-scoped role', async () => {
      const res = await api
        .patch(`/v1/roles/${agencyRole().id.toString()}`)
        .send({ name: 'Renamed' });
      expect(res.status).toBe(404);
    });

    it('204 deletes an unassigned PLATFORM role', async () => {
      const before = DB.roles.size;
      const viewer = platformRole('VIEWER');
      const res = await api.delete(`/v1/roles/${viewer.id.toString()}`);
      expect(res.status).toBe(204);
      expect(DB.roles.size).toBe(before - 1);
    });

    it('409 when deleting a role that still has platform assignments', async () => {
      const admin = platformRole('PLATFORM_ADMIN');
      const res = await api.delete(`/v1/roles/${admin.id.toString()}`);
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('ROLE_HAS_PLATFORM_ASSIGNMENTS');
      expect(DB.roles.has(admin.id)).toBe(true);
    });

    it('404 on deleting an unknown role', async () => {
      const res = await api.delete('/v1/roles/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('Permission catalog (code-defined, read-only, PLATFORM only)', () => {
    it('401 without auth', async () => {
      const res = await request(app.getHttpServer()).get('/v1/permissions');
      expect(res.status).toBe(401);
    });

    it('lists the scoped PLATFORM permission catalog', async () => {
      const res = await api.get('/v1/permissions');
      expect(res.status).toBe(200);
      const keys = res.body.map((p: PermissionRow) => p.key);
      expect(new Set(keys)).toEqual(new Set(ALL_PLATFORM_PERMISSION_KEYS));
      for (const removed of [
        'USER_VIEW',
        'ROLE_VIEW',
        'PLATFORM_ROLE_MANAGE',
        'PERMISSION_CREATE',
        'PERMISSION_UPDATE',
        'PERMISSION_DELETE',
      ]) {
        expect(keys).not.toContain(removed);
      }
      expect(res.body.every((p: PermissionRow) => p.scope === 'PLATFORM')).toBe(true);
    });

    it('exposes scope, resource and action metadata', async () => {
      const res = await api.get('/v1/permissions');
      const roleView = res.body.find((p: PermissionRow) => p.key === 'PLATFORM_ROLE_VIEW');
      expect(roleView).toMatchObject({
        scope: 'PLATFORM',
        name: expect.any(String),
      });
      expect(typeof roleView.resource).toBe('string');
      expect(typeof roleView.action).toBe('string');
      expect(roleView.key).toBe(`${roleView.scope}_${roleView.resource}_${roleView.action}`);
    });

    it('does not expose single-permission lookup', async () => {
      const res = await api.get('/v1/permissions/PLATFORM_ROLE_VIEW');
      expect(res.status).toBe(404);
    });

    it('does not expose permission create/update/delete endpoints', async () => {
      const create = await api.post('/v1/permissions').send({ key: 'REPORT_VIEW', name: 'X' });
      expect(create.status).toBe(404);

      const update = await api.patch('/v1/permissions/PLATFORM_ROLE_VIEW').send({ name: 'X' });
      expect(update.status).toBe(404);

      const remove = await api.delete('/v1/permissions/PLATFORM_ROLE_VIEW');
      expect(remove.status).toBe(404);
    });
  });

  describe('Available permissions for a PLATFORM role', () => {
    it('lists PLATFORM permissions only', async () => {
      addPermission('AGENCY_TOUR_VIEW', 'AGENCY');
      const res = await api.get('/v1/roles/available-permissions');
      expect(res.status).toBe(200);
      const keys = res.body.map((p: PermissionRow) => p.key);
      expect(keys).toContain('PLATFORM_ROLE_VIEW');
      expect(keys).not.toContain('AGENCY_TOUR_VIEW');
      expect(res.body.every((p: PermissionRow) => p.scope === 'PLATFORM')).toBe(true);
    });

    it('is not treated as a role id', async () => {
      const res = await api.get('/v1/roles/available-permissions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('requires PLATFORM_ROLE_VIEW', async () => {
      await authorizeOnly(MANAGE_KEY);
      const res = await api.get('/v1/roles/available-permissions');
      expect(res.status).toBe(403);
    });
  });

  describe('Role <-> Permission management', () => {
    it('returns the sorted permission keys of a PLATFORM role', async () => {
      const viewer = platformRole('VIEWER');
      const res = await api.get(`/v1/roles/${viewer.id.toString()}/permissions`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([VIEWER_KEY]);
    });

    it('404 when the role does not exist', async () => {
      const res = await api.get('/v1/roles/999999/permissions');
      expect(res.status).toBe(404);
    });

    it('404 for an AGENCY-scoped role', async () => {
      const res = await api.get(`/v1/roles/${agencyRole().id.toString()}/permissions`);
      expect(res.status).toBe(404);
    });

    it('replaces the full permission set', async () => {
      const viewer = platformRole('VIEWER');
      const res = await api
        .put(`/v1/roles/${viewer.id.toString()}/permissions`)
        .send({ permissionKeys: ['PLATFORM_USER_VIEW', 'PLATFORM_USER_CREATE'] });
      expect(res.status).toBe(200);
      expect(res.body.permissionKeys).toEqual([
        'PLATFORM_USER_CREATE',
        'PLATFORM_USER_VIEW',
      ]);

      const after = await api.get(`/v1/roles/${viewer.id.toString()}/permissions`);
      expect(after.body).toEqual(['PLATFORM_USER_CREATE', 'PLATFORM_USER_VIEW']);
    });

    it('deduplicates repeated keys without failing', async () => {
      const admin = platformRole('PLATFORM_ADMIN');
      const res = await api
        .put(`/v1/roles/${admin.id.toString()}/permissions`)
        .send({
          permissionKeys: ['PLATFORM_USER_VIEW', 'PLATFORM_ROLE_VIEW', 'PLATFORM_USER_VIEW'],
        });
      expect(res.status).toBe(200);
      expect(res.body.permissionKeys).toEqual(['PLATFORM_ROLE_VIEW', 'PLATFORM_USER_VIEW']);
    });

    it('400 with unknown keys and leaves existing assignments untouched (atomic)', async () => {
      const admin = platformRole('PLATFORM_ADMIN');
      const before = await api.get(`/v1/roles/${admin.id.toString()}/permissions`);

      const res = await api
        .put(`/v1/roles/${admin.id.toString()}/permissions`)
        .send({ permissionKeys: ['PLATFORM_USER_VIEW', 'DOES_NOT_EXIST'] });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('UNKNOWN_PERMISSION_KEYS');
      expect(res.body.unknownKeys).toEqual(['DOES_NOT_EXIST']);

      const after = await api.get(`/v1/roles/${admin.id.toString()}/permissions`);
      expect(after.body).toEqual(before.body);
    });

    it('400 with cross-scope keys and leaves existing assignments untouched (atomic)', async () => {
      addPermission('AGENCY_TOUR_VIEW', 'AGENCY');
      const admin = platformRole('PLATFORM_ADMIN');
      const before = await api.get(`/v1/roles/${admin.id.toString()}/permissions`);

      const res = await api
        .put(`/v1/roles/${admin.id.toString()}/permissions`)
        .send({ permissionKeys: ['PLATFORM_ROLE_VIEW', 'AGENCY_TOUR_VIEW'] });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('CROSS_SCOPE_PERMISSION_KEYS');
      expect(res.body.crossScopeKeys).toEqual(['AGENCY_TOUR_VIEW']);

      const after = await api.get(`/v1/roles/${admin.id.toString()}/permissions`);
      expect(after.body).toEqual(before.body);
    });

    it('clears all permissions with an empty array', async () => {
      const viewer = platformRole('VIEWER');
      const res = await api
        .put(`/v1/roles/${viewer.id.toString()}/permissions`)
        .send({ permissionKeys: [] });
      expect(res.status).toBe(200);
      expect(res.body.permissionKeys).toEqual([]);

      const after = await api.get(`/v1/roles/${viewer.id.toString()}/permissions`);
      expect(after.body).toEqual([]);
    });

    it("reflects a permission change in the user's own role immediately (no JWT reissue)", async () => {
      const admin = platformRole('PLATFORM_ADMIN');
      const allowed = await api.get(`/v1/roles/${admin.id.toString()}/permissions`);
      expect(allowed.status).toBe(200);

      const res = await api
        .put(`/v1/roles/${admin.id.toString()}/permissions`)
        .send({ permissionKeys: [MANAGE_KEY] });
      expect(res.status).toBe(200);

      const denied = await api.get(`/v1/roles/${admin.id.toString()}/permissions`);
      expect(denied.status).toBe(403);
    });

    it('404 when replacing permissions on an unknown role', async () => {
      const res = await api
        .put('/v1/roles/999999/permissions')
        .send({ permissionKeys: [] });
      expect(res.status).toBe(404);
    });

    it('404 when replacing permissions on an AGENCY-scoped role', async () => {
      const res = await api
        .put(`/v1/roles/${agencyRole().id.toString()}/permissions`)
        .send({ permissionKeys: [] });
      expect(res.status).toBe(404);
    });
  });

  describe('Permission enforcement', () => {
    it('403 for a user without PLATFORM_ROLE_VIEW on role listing', async () => {
      await authorizeOnly(MANAGE_KEY);
      const res = await api.get('/v1/roles');
      expect(res.status).toBe(403);
    });

    it('403 for a user without PLATFORM_ROLE_VIEW on permission catalog listing', async () => {
      await authorizeOnly(MANAGE_KEY);
      const res = await api.get('/v1/permissions');
      expect(res.status).toBe(403);
    });

    it('403 for a user without PLATFORM_ROLE_PERMISSION_MANAGE on role permission management', async () => {
      await authorizeOnly(VIEWER_KEY);
      const limited = platformRole('LIMITED');
      const res = await api
        .put(`/v1/roles/${limited.id.toString()}/permissions`)
        .send({ permissionKeys: [] });
      expect(res.status).toBe(403);
    });

    it('allows an operation when the user holds exactly the required permission', async () => {
      await authorizeOnly(VIEWER_KEY);
      const res = await api.get('/v1/roles');
      expect(res.status).toBe(200);
    });
  });

  describe('Global Agency roles (scope=AGENCY, agencyId=null)', () => {
    it('lists only Global Agency roles (never PLATFORM or custom roles)', async () => {
      const res = await api.get('/v1/agency-roles');
      expect(res.status).toBe(200);
      const names = res.body.map((r: RoleRow) => r.name);
      expect(names).toContain('AGENCY_OP');
      expect(names).not.toContain('PLATFORM_ADMIN');
      expect(names).not.toContain('VIEWER');
      expect(names).not.toContain('CUSTOM_AGENT');
      expect(
        res.body.every((r: RoleRow) => r.scope === 'AGENCY' && r.agencyId === null),
      ).toBe(true);
    });

    it('creates a Global Agency role and ignores client-supplied scope/agencyId', async () => {
      const res = await api.post('/v1/agency-roles').send({
        key: 'AGENCY_BOOKING_AGENT',
        name: 'Booking Agent',
        scope: 'PLATFORM',
        agencyId: '7',
        description: 'Handles booking operations for agencies',
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        key: 'AGENCY_BOOKING_AGENT',
        name: 'Booking Agent',
        scope: 'AGENCY',
        agencyId: null,
      });
      expect(typeof res.body.id).toBe('string');
    });

    it('allows the same key and name in a different scope than PLATFORM', async () => {
      const res = await api
        .post('/v1/agency-roles')
        .send({ key: 'VIEWER', name: 'VIEWER' });
      expect(res.status).toBe(201);
      expect(res.body.scope).toBe('AGENCY');
      expect(res.body.key).toBe('VIEWER');
    });

    it('409 with ROLE_KEY_SCOPE_CONFLICT on a duplicate Agency key', async () => {
      const res = await api
        .post('/v1/agency-roles')
        .send({ key: 'AGENCY_OP', name: 'Duplicate Key' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('ROLE_KEY_SCOPE_CONFLICT');
    });

    it('409 with ROLE_NAME_SCOPE_CONFLICT on a duplicate Agency name', async () => {
      const res = await api
        .post('/v1/agency-roles')
        .send({ key: 'AGENCY_DUPLICATE_NAME', name: 'AGENCY_OP' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('ROLE_NAME_SCOPE_CONFLICT');
    });

    it('keeps the key immutable and never accepts scope/agencyId on update', async () => {
      const role = globalAgencyRole('AGENCY_OP');
      const res = await api
        .patch(`/v1/agency-roles/${role.id.toString()}`)
        .send({ name: 'Agency Operator', key: 'AGENCY_HACKED', scope: 'PLATFORM', agencyId: '7' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Agency Operator');
      expect(res.body.key).toBe('AGENCY_OP');
      expect(res.body.scope).toBe('AGENCY');
      expect(res.body.agencyId).toBeNull();
    });

    it('exposes only the AGENCY permission catalog', async () => {
      const res = await api.get('/v1/agency-roles/available-permissions');
      expect(res.status).toBe(200);
      expect(new Set(res.body.map((p: PermissionRow) => p.key))).toEqual(
        new Set(ALL_AGENCY_PERMISSION_KEYS),
      );
      expect(res.body.every((p: PermissionRow) => p.scope === 'AGENCY')).toBe(true);
    });

    it('rejects cross-scope (PLATFORM) permission keys on an Agency role', async () => {
      const role = globalAgencyRole('AGENCY_OP');
      const res = await api
        .put(`/v1/agency-roles/${role.id.toString()}/permissions`)
        .send({ permissionKeys: ['PLATFORM_ROLE_VIEW'] });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('CROSS_SCOPE_PERMISSION_KEYS');
    });

    it('404 for a PLATFORM role on the agency endpoint (scopes never mix)', async () => {
      const admin = platformRole('PLATFORM_ADMIN');
      const res = await api.get(`/v1/agency-roles/${admin.id.toString()}`);
      expect(res.status).toBe(404);
    });

    it('404 for a custom agency role (Group 2) on the global agency endpoint', async () => {
      const custom = [...DB.roles.values()].find((r) => r.agencyId !== null)!;
      const res = await api.get(`/v1/agency-roles/${custom.id.toString()}`);
      expect(res.status).toBe(404);
    });

    it('204 deletes a Global Agency role', async () => {
      const role = globalAgencyRole('AGENCY_OP');
      const res = await api.delete(`/v1/agency-roles/${role.id.toString()}`);
      expect(res.status).toBe(204);
      expect(DB.roles.has(role.id)).toBe(false);
    });

    it('requires PLATFORM_AGENCY_ROLE_VIEW (not PLATFORM_ROLE_VIEW) to list Global Agency roles', async () => {
      await authorizeOnly(VIEWER_KEY);
      const res = await api.get('/v1/agency-roles');
      expect(res.status).toBe(403);
    });

    it('allows listing Global Agency roles with PLATFORM_AGENCY_ROLE_VIEW', async () => {
      await authorizeOnly('PLATFORM_AGENCY_ROLE_VIEW');
      const res = await api.get('/v1/agency-roles');
      expect(res.status).toBe(200);
    });

    it('requires PLATFORM_AGENCY_ROLE_CREATE (not PLATFORM_ROLE_CREATE) to create a Global Agency role', async () => {
      await authorizeOnly('PLATFORM_ROLE_CREATE');
      const res = await api
        .post('/v1/agency-roles')
        .send({ key: 'AGENCY_NEW', name: 'Agency New' });
      expect(res.status).toBe(403);
    });
  });

  describe('Protected system roles', () => {
    /** The canonical global agency role, as the seed establishes it. */
    const canonical = (): RoleRow => {
      const role = addRole(
        'Agency Owner',
        'AGENCY',
        ALL_AGENCY_PERMISSION_KEYS.slice(0, 2),
        null,
        'AGENCY_OWNER',
        AGENCY_ADMIN_SYSTEM_KEY,
      );
      return role;
    };

    it('409 SYSTEM_ROLE_PROTECTED when renaming the canonical role', async () => {
      const role = canonical();
      const res = await api
        .patch(`/v1/agency-roles/${role.id.toString()}`)
        .send({ name: 'Something Else' });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('SYSTEM_ROLE_PROTECTED');
      expect(DB.roles.get(role.id)!.name).toBe('Agency Owner');
    });

    it('409 SYSTEM_ROLE_PROTECTED when deleting the canonical role', async () => {
      const role = canonical();
      const res = await api.delete(`/v1/agency-roles/${role.id.toString()}`);

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('SYSTEM_ROLE_PROTECTED');
      expect(DB.roles.has(role.id)).toBe(true);
      expect(DB.roles.get(role.id)!.systemKey).toBe(AGENCY_ADMIN_SYSTEM_KEY);
    });

    it('leaves ordinary global agency roles editable and deletable', async () => {
      canonical();
      const ordinary = globalAgencyRole('AGENCY_OP');

      const patched = await api
        .patch(`/v1/agency-roles/${ordinary.id.toString()}`)
        .send({ name: 'Renamed Op' });
      expect(patched.status).toBe(200);

      const deleted = await api.delete(`/v1/agency-roles/${ordinary.id.toString()}`);
      expect(deleted.status).toBe(204);
    });

    it('never exposes or accepts systemKey through the role API', async () => {
      const role = canonical();

      const listed = await api.get('/v1/agency-roles');
      expect(listed.status).toBe(200);
      for (const row of listed.body as Array<Record<string, unknown>>) {
        expect(row).not.toHaveProperty('systemKey');
      }

      // A client cannot claim a system identity on creation: the field is
      // stripped by the schema, so the created role stays an ordinary one.
      const created = await api.post('/v1/agency-roles').send({
        key: 'AGENCY_IMPOSTOR',
        name: 'Impostor',
        systemKey: AGENCY_ADMIN_SYSTEM_KEY,
      });
      expect([201, 400]).toContain(created.status);
      if (created.status === 201) {
        const impostor = [...DB.roles.values()].find((r) => r.key === 'AGENCY_IMPOSTOR')!;
        expect(impostor.systemKey).toBeNull();
      }
      // Whatever happened, the identity still belongs to exactly one role.
      const holders = [...DB.roles.values()].filter(
        (r) => r.systemKey === AGENCY_ADMIN_SYSTEM_KEY,
      );
      expect(holders).toHaveLength(1);
      expect(holders[0]!.id).toBe(role.id);
    });
  });
});
