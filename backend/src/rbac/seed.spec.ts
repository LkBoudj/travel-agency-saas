import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RBAC_BOOTSTRAP_EMAIL_ENV } from '../../prisma/seed.js';
import { getBootstrapEmail, seedRbacBootstrap } from '../../prisma/seed.js';
import {
  ALL_PLATFORM_PERMISSION_KEYS,
  DEFAULT_GLOBAL_AGENCY_ROLES,
  DEFAULT_PLATFORM_ROLES,
  PLATFORM_ADMIN_ROLE_KEY,
  RBAC_PERMISSION_CATALOG,
} from './rbac.constants.js';
import type { RolePreset } from './rbac.types.js';

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
  key: string;
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
  roles: new Map<string, StoredRole>(),
  nextRoleId: 1n,
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
        const remainingIds = new Set(
          [...store.permissions.values()].map((permission) => permission.id),
        );
        for (const link of store.links) {
          const permissionId = BigInt(link.split(':')[1]);
          if (!remainingIds.has(permissionId)) {
            store.links.delete(link);
          }
        }
        return { count: staleRows.length };
      },
    ),
  },
  role: {
    findFirst: vi.fn(
      async (args: {
        where: { scope: string; key: string; agencyId: bigint | null };
      }): Promise<StoredRole | null> => {
        const role = store.roles.get(args.where.key);
        if (
          role &&
          role.scope === args.where.scope &&
          role.key === args.where.key &&
          role.agencyId === args.where.agencyId
        ) {
          return role;
        }
        return null;
      },
    ),
    create: vi.fn(async (args: { data: Omit<StoredRole, 'id'> }): Promise<StoredRole> => {
      const row: StoredRole = { id: store.nextRoleId, ...args.data };
      store.nextRoleId += 1n;
      store.roles.set(row.key, row);
      return row;
    }),
  },
  rolePermission: {
    createMany: vi.fn(
      async (args: {
        data: { roleId: bigint; permissionId: bigint }[];
        skipDuplicates?: boolean;
      }): Promise<{ count: number }> => {
        for (const link of args.data) {
          store.links.add(`${link.roleId}:${link.permissionId}`);
        }
        return { count: args.data.length };
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
      async (args: { create: StoredAssignment; update: Record<string, never> }) => {
        const exists = store.assignments.some(
          (assignment) =>
            assignment.appUserId === args.create.appUserId &&
            assignment.roleId === args.create.roleId,
        );
        if (!exists) {
          store.assignments.push(args.create);
        }
        return {};
      },
    ),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    }
    throw new Error('$transaction: array form is not used by the seed');
  }),
};

const BOOTSTRAP_EMAIL = 'super@mail.com';

const ALL_PRESETS: ReadonlyArray<RolePreset> = [
  ...DEFAULT_PLATFORM_ROLES,
  ...DEFAULT_GLOBAL_AGENCY_ROLES,
];

function countLinks(roleId: bigint): number {
  return [...store.links].filter((link) => link.startsWith(`${roleId}:`)).length;
}

function pristineDatabase(): void {
  store.permissions.clear();
  store.nextPermissionId = 1n;
  store.roles.clear();
  store.nextRoleId = 1n;
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

describe('prisma/seed.ts RBAC bootstrap', () => {
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

  it('seeds the full catalog, every default role, its links and the bootstrap assignment', async () => {
    await seedRbacBootstrap(prismaMock);

    expect(store.permissions.size).toBe(RBAC_PERMISSION_CATALOG.length);
    expect(store.roles.size).toBe(ALL_PRESETS.length);

    for (const preset of ALL_PRESETS) {
      const role = store.roles.get(preset.key);
      expect(role, preset.key).toMatchObject({
        key: preset.key,
        name: preset.name,
        scope: preset.scope,
        agencyId: null,
      });
      expect(countLinks(role!.id), preset.key).toBe(preset.permissionKeys.length);
    }

    const admin = store.roles.get(PLATFORM_ADMIN_ROLE_KEY)!;
    expect(countLinks(admin.id)).toBe(ALL_PLATFORM_PERMISSION_KEYS.length);
    expect(store.assignments).toEqual([{ appUserId: 900n, roleId: admin.id }]);
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

    await seedRbacBootstrap(prismaMock);

    expect(store.permissions.get(target.key)).toMatchObject({
      name: target.name,
      description: target.description,
      scope: target.scope,
      resource: target.resource,
      action: target.action,
    });
  });

  it('is idempotent: a second and third run do not duplicate rows', async () => {
    await seedRbacBootstrap(prismaMock);
    const afterFirst = {
      permissions: store.permissions.size,
      roles: store.roles.size,
      links: store.links.size,
      assignments: store.assignments.length,
    };

    vi.clearAllMocks();
    await seedRbacBootstrap(prismaMock);
    await seedRbacBootstrap(prismaMock);

    expect(store.permissions.size).toBe(afterFirst.permissions);
    expect(store.roles.size).toBe(afterFirst.roles);
    expect(store.links.size).toBe(afterFirst.links);
    expect(store.assignments).toHaveLength(afterFirst.assignments);
    expect(store.assignments).toHaveLength(1);
  });

  it('removes pre-existing permissions that are no longer defined in the catalog', async () => {
    await seedRbacBootstrap(prismaMock);

    expect(store.permissions.has('ROLE_MANAGE_LEGACY')).toBe(false);
    const deleteManyMock = prismaMock.permission.deleteMany as ReturnType<typeof vi.fn>;
    const staleKeys = deleteManyMock.mock.calls[0][0].where?.key?.in ?? [];
    expect(staleKeys).toContain('ROLE_MANAGE_LEGACY');

    await seedRbacBootstrap(prismaMock);
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

    await seedRbacBootstrap(prismaMock);

    expect(store.permissions.has('USER_VIEW')).toBe(false);
  });

  it('never overwrites an existing non-system preset or its permission mappings', async () => {
    const preset = DEFAULT_GLOBAL_AGENCY_ROLES.find((role) => role.key === 'AGENCY_BOOKING_AGENT')!;
    store.permissions.clear();
    const seededPermission = await prismaMock.permission.upsert({
      where: { key: 'AGENCY_BOOKING_VIEW' },
      update: {
        name: 'View bookings',
        description: 'View bookings',
        scope: 'AGENCY',
        resource: 'BOOKING',
        action: 'VIEW',
      },
      create: {
        id: 1n,
        key: 'AGENCY_BOOKING_VIEW',
        name: 'View bookings',
        description: 'View bookings',
        scope: 'AGENCY',
        resource: 'BOOKING',
        action: 'VIEW',
      },
    });
    const custom: StoredRole = {
      id: 500n,
      key: preset.key,
      name: 'Custom Booking Team',
      scope: 'AGENCY',
      agencyId: null,
      description: 'Hand-crafted by the platform admin',
    };
    store.roles.set(custom.key, custom);
    store.nextRoleId = 501n;
    store.links.add(`${custom.id}:${seededPermission.id}`);

    await seedRbacBootstrap(prismaMock);

    const after = store.roles.get(preset.key)!;
    expect(after.name).toBe('Custom Booking Team');
    expect(after.description).toBe('Hand-crafted by the platform admin');
    expect(countLinks(after.id)).toBe(1);
    expect(after.id).toBe(500n);
  });

  it('keeps a customized PLATFORM_ADMIN name while synchronizing its permissions', async () => {
    store.roles.set(PLATFORM_ADMIN_ROLE_KEY, {
      id: 700n,
      key: PLATFORM_ADMIN_ROLE_KEY,
      name: 'Renamed Admin',
      scope: 'PLATFORM',
      agencyId: null,
      description: 'Locally customized',
    });
    store.nextRoleId = 701n;

    await seedRbacBootstrap(prismaMock);

    const after = store.roles.get(PLATFORM_ADMIN_ROLE_KEY)!;
    expect(after.id).toBe(700n);
    expect(after.name).toBe('Renamed Admin');
    expect(after.description).toBe('Locally customized');
    expect(countLinks(after.id)).toBe(ALL_PLATFORM_PERMISSION_KEYS.length);
  });

  it('skips assignment when the bootstrap email does not match any user', async () => {
    process.env[RBAC_BOOTSTRAP_EMAIL_ENV] = 'nobody@example.com';
    await seedRbacBootstrap(prismaMock);

    expect(store.assignments).toHaveLength(0);
  });

  it('does not attempt an assignment when no bootstrap email is configured', async () => {
    delete process.env[RBAC_BOOTSTRAP_EMAIL_ENV];
    await seedRbacBootstrap(prismaMock);

    expect(store.assignments).toHaveLength(0);
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.platformRoleAssignment.upsert).not.toHaveBeenCalled();
  });
});
