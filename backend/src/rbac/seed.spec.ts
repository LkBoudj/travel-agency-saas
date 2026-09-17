import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RBAC_BOOTSTRAP_EMAIL_ENV } from '../../prisma/seed.js';
import { getBootstrapEmail, seedPlatformBootstrap } from '../../prisma/seed.js';
import { PLATFORM_ADMIN_ROLE, RBAC_PERMISSION_CATALOG } from './rbac.constants.js';

type StoredPermission = {
  id: bigint;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  resource: string;
  action: string;
};
type StoredRole = {
  id: bigint;
  name: string;
  scope: string;
  agencyId: bigint | null;
  description: string | null;
};
type StoredUser = { id: bigint; email: string };
type StoredAssignment = { appUserId: bigint; roleId: bigint };

const store = {
  permissions: new Map<string, StoredPermission>(),
  nextPermissionId: 1n,
  role: null as StoredRole | null,
  links: new Set<string>(),
  users: new Map<string, StoredUser>(),
  assignments: [] as StoredAssignment[],
};

const prismaMock = {
  permission: {
    upsert: vi.fn(
      async (args: {
        where: { key: string };
        update: {
          name: string;
          description: string | null;
          scope: string;
          resource: string;
          action: string;
        };
        create: StoredPermission;
      }) => {
        const existing = store.permissions.get(args.where.key);
        if (existing) {
          existing.name = args.update.name;
          existing.description = args.update.description;
          existing.scope = args.update.scope;
          existing.resource = args.update.resource;
          existing.action = args.update.action;
          return existing;
        }
        const row: StoredPermission = {
          id: store.nextPermissionId,
          key: args.create.key,
          name: args.create.name,
          description: args.create.description,
          scope: args.create.scope,
          resource: args.create.resource,
          action: args.create.action,
        };
        store.nextPermissionId += 1n;
        store.permissions.set(row.key, row);
        return row;
      },
    ),
    findMany: vi.fn(
      async (args: { where?: { key?: { notIn: string[] } } }): Promise<{ key: string }[]> => {
        if (args.where?.key?.notIn) {
          const excluded = new Set(args.where.key.notIn);
          return [...store.permissions.values()]
            .filter((permission) => !excluded.has(permission.key))
            .map((permission) => ({ key: permission.key }));
        }
        return [...store.permissions.values()].map((permission) => ({ key: permission.key }));
      },
    ),
    deleteMany: vi.fn(
      async (args: { where?: { key?: { in: string[] } } }): Promise<{ count: number }> => {
        const keys = args.where?.key?.in ?? [];
        const staleRows = [...store.permissions.values()].filter((permission) =>
          keys.includes(permission.key),
        );
        for (const row of staleRows) {
          store.permissions.delete(row.key);
        }
        const remainingIds = new Set([...store.permissions.values()].map((permission) => permission.id));
        let removedLinks = 0;
        for (const key of store.links) {
          const permissionId = BigInt(key.split(':')[1]);
          if (!remainingIds.has(permissionId)) {
            store.links.delete(key);
            removedLinks += 1;
          }
        }
        return { count: staleRows.length };
      },
    ),
  },
  role: {
    findFirst: vi.fn(
      async (args: {
        where: { scope: string; name: string; agencyId: bigint | null };
      }) => {
        if (
          store.role &&
          store.role.scope === args.where.scope &&
          store.role.name === args.where.name &&
          store.role.agencyId === args.where.agencyId
        ) {
          return store.role;
        }
        return null;
      },
    ),
    update: vi.fn(
      async (args: { where: { id: bigint }; data: { description: string | null } }) => {
        if (!store.role) throw new Error('role.update: no role');
        store.role.description = args.data.description;
        return store.role;
      },
    ),
    create: vi.fn(async (args: { data: Omit<StoredRole, 'id'> }) => {
      const row: StoredRole = { id: 1n, ...args.data };
      store.role = row;
      return row;
    }),
  },
  rolePermission: {
    upsert: vi.fn(
      async (args: {
        where: { roleId_permissionId: { roleId: bigint; permissionId: bigint } };
        create: { roleId: bigint; permissionId: bigint };
      }) => {
        const key = `${args.create.roleId}:${args.create.permissionId}`;
        store.links.add(key);
        return {};
      },
    ),
  },
  appUser: {
    findUnique: vi.fn(async (args: { where: { email: string } }) => {
      return store.users.get(args.where.email) ?? null;
    }),
  },
  platformRoleAssignment: {
    upsert: vi.fn(
      async (args: {
        create: StoredAssignment;
        update: Record<string, never>;
      }) => {
        const exists = store.assignments.some(
          (a) => a.appUserId === args.create.appUserId && a.roleId === args.create.roleId,
        );
        if (!exists) {
          store.assignments.push(args.create);
        }
        return {};
      },
    ),
  },
};

const BOOTSTRAP_EMAIL = 'super@mail.com';

function pristineDatabase(): void {
  store.permissions.clear();
  store.nextPermissionId = 1n;
  store.role = null;
  store.links.clear();
  store.users.clear();
  store.assignments = [];

  store.users.set(BOOTSTRAP_EMAIL, { id: 900n, email: BOOTSTRAP_EMAIL });
  store.permissions.set('ROLE_MANAGE_LEGACY', {
    id: 0n,
    key: 'ROLE_MANAGE_LEGACY',
    name: 'Legacy manage roles',
    description: 'Pre-existing permission that must not survive the catalog sync',
    scope: 'PLATFORM',
    resource: 'ROLE',
    action: 'MANAGE',
  });
}

describe('prisma/seed.ts platform bootstrap', () => {
  beforeEach(() => {
    pristineDatabase();
    process.env[RBAC_BOOTSTRAP_EMAIL_ENV] = BOOTSTRAP_EMAIL;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env[RBAC_BOOTSTRAP_EMAIL_ENV];
  });

  it('reads the bootstrap email from the environment (never hardcoded)', () => {
    expect(getBootstrapEmail()).toBe(BOOTSTRAP_EMAIL);
    delete process.env[RBAC_BOOTSTRAP_EMAIL_ENV];
    expect(getBootstrapEmail()).toBeUndefined();
  });

  it('defines exactly eleven PLATFORM permissions whose key matches scope_resource_action', () => {
    expect(RBAC_PERMISSION_CATALOG).toHaveLength(11);
    for (const permission of RBAC_PERMISSION_CATALOG) {
      expect(permission.scope).toBe('PLATFORM');
      expect(permission.key).toBe(
        `${permission.scope}_${permission.resource}_${permission.action}`,
      );
    }
    expect(new Set(RBAC_PERMISSION_CATALOG.map((p) => p.key)).size).toBe(11);
  });

  it('seeds every catalog permission, the PLATFORM_ADMIN role, all links and the bootstrap assignment', async () => {
    await seedPlatformBootstrap(prismaMock);

    for (const permission of RBAC_PERMISSION_CATALOG) {
      expect(store.permissions.has(permission.key)).toBe(true);
    }
    expect(store.permissions.size).toBe(RBAC_PERMISSION_CATALOG.length);
    expect(store.role).toMatchObject({
      name: PLATFORM_ADMIN_ROLE.name,
      scope: PLATFORM_ADMIN_ROLE.scope,
    });
    expect(store.links.size).toBe(RBAC_PERMISSION_CATALOG.length);
    expect(store.assignments).toEqual([
      { appUserId: 900n, roleId: store.role!.id },
    ]);
  });

  it('synchronizes scope, resource and action metadata from the catalog', async () => {
    const target = RBAC_PERMISSION_CATALOG[0];
    store.permissions.set(target.key, {
      id: 42n,
      key: target.key,
      name: 'Stale name',
      description: 'Stale description',
      scope: 'AGENCY',
      resource: 'STALE',
      action: 'STALE',
    });

    await seedPlatformBootstrap(prismaMock);

    expect(store.permissions.get(target.key)).toMatchObject({
      name: target.name,
      description: target.description,
      scope: target.scope,
      resource: target.resource,
      action: target.action,
    });
  });

  it('is idempotent: a second and third run do not duplicate rows', async () => {
    await seedPlatformBootstrap(prismaMock);
    const afterFirst = {
      permissions: store.permissions.size,
      links: store.links.size,
      assignments: store.assignments.length,
    };

    vi.clearAllMocks();
    await seedPlatformBootstrap(prismaMock);
    await seedPlatformBootstrap(prismaMock);

    expect(store.permissions.size).toBe(afterFirst.permissions);
    expect(store.links.size).toBe(afterFirst.links);
    expect(store.assignments.length).toBe(afterFirst.assignments);
    expect(store.assignments).toHaveLength(1);
  });

  it('removes pre-existing permissions that are no longer defined in the catalog', async () => {
    await seedPlatformBootstrap(prismaMock);

    expect(store.permissions.has('ROLE_MANAGE_LEGACY')).toBe(false);
    const deleteManyMock = prismaMock.permission.deleteMany as ReturnType<typeof vi.fn>;
    const staleKeys = deleteManyMock.mock.calls[0][0].where?.key?.in ?? [];
    expect(staleKeys).toContain('ROLE_MANAGE_LEGACY');

    await seedPlatformBootstrap(prismaMock);
    expect(store.permissions.has('ROLE_MANAGE_LEGACY')).toBe(false);
    expect(store.permissions.size).toBe(RBAC_PERMISSION_CATALOG.length);
  });

  it('deletes legacy unscoped catalog keys that are no longer part of the catalog', async () => {
    store.permissions.set('USER_VIEW', {
      id: 77n,
      key: 'USER_VIEW',
      name: 'View users',
      description: 'Legacy unscoped key',
      scope: 'PLATFORM',
      resource: 'USER',
      action: 'VIEW',
    });

    await seedPlatformBootstrap(prismaMock);

    expect(store.permissions.has('USER_VIEW')).toBe(false);
    expect([...store.permissions.keys()].every((key) => key.startsWith('PLATFORM_'))).toBe(true);
  });

  it('skips assignment when the bootstrap email does not match any user', async () => {
    process.env[RBAC_BOOTSTRAP_EMAIL_ENV] = 'nobody@example.com';
    await seedPlatformBootstrap(prismaMock);

    expect(store.assignments).toHaveLength(0);
  });

  it('does not attempt an assignment when no bootstrap email is configured', async () => {
    delete process.env[RBAC_BOOTSTRAP_EMAIL_ENV];
    await seedPlatformBootstrap(prismaMock);

    expect(store.assignments).toHaveLength(0);
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.platformRoleAssignment.upsert).not.toHaveBeenCalled();
  });
});
