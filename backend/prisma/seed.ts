import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import {
  ALL_PLATFORM_PERMISSION_KEYS,
  DEFAULT_GLOBAL_AGENCY_ROLES,
  DEFAULT_PLATFORM_ROLES,
  PLATFORM_ADMIN_ROLE_KEY,
  RBAC_PERMISSION_CATALOG,
  validateRbacCatalog,
} from '../src/rbac/rbac.constants.js';
import type { RolePreset } from '../src/rbac/rbac.types.js';

export const RBAC_BOOTSTRAP_EMAIL_ENV = 'RBAC_BOOTSTRAP_EMAIL';

type SeedClient = Prisma.TransactionClient;

/**
 * Optional explicit bootstrap user for a platform role assignment.
 * No personal email is hardcoded; assignment only happens when the variable
 * is provided AND the user already exists.
 */
export function getBootstrapEmail(): string | undefined {
  const email = process.env[RBAC_BOOTSTRAP_EMAIL_ENV]?.trim().toLowerCase();
  return email ? email : undefined;
}

function requirePreset(presets: ReadonlyArray<RolePreset>, key: string): RolePreset {
  const preset = presets.find((role) => role.key === key);
  if (!preset) {
    throw new Error(`[seed] Missing required default role preset "${key}".`);
  }
  return preset;
}

async function syncPermissions(tx: SeedClient): Promise<Map<string, bigint>> {
  const permissionIdByKey = new Map<string, bigint>();

  for (const permission of RBAC_PERMISSION_CATALOG) {
    const row = await tx.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
        scope: permission.scope,
        resource: permission.resource,
        action: permission.action,
      },
      create: { ...permission },
    });
    permissionIdByKey.set(permission.key, row.id);
  }

  const stalePermissions = await tx.permission.findMany({
    where: { key: { notIn: [...permissionIdByKey.keys()] } },
    select: { key: true },
  });
  if (stalePermissions.length > 0) {
    await tx.permission.deleteMany({
      where: { key: { in: stalePermissions.map((permission) => permission.key) } },
    });
  }

  return permissionIdByKey;
}

async function upsertSystemRole(tx: SeedClient, preset: RolePreset): Promise<bigint> {
  const existing = await tx.role.findFirst({
    where: { scope: preset.scope, key: preset.key, agencyId: null },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const created = await tx.role.create({
    data: {
      key: preset.key,
      name: preset.name,
      scope: preset.scope,
      agencyId: null,
      description: preset.description,
    },
  });
  return created.id;
}

async function syncRolePermissions(
  tx: SeedClient,
  roleId: bigint,
  permissionKeys: readonly string[],
  permissionIdByKey: Map<string, bigint>,
): Promise<void> {
  const data = permissionKeys.map((permissionKey) => {
    const permissionId = permissionIdByKey.get(permissionKey);
    if (!permissionId) {
      throw new Error(`[seed] Missing permission id for "${permissionKey}".`);
    }
    return { roleId, permissionId };
  });
  if (data.length > 0) {
    await tx.rolePermission.createMany({ data, skipDuplicates: true });
  }
}

async function assignBootstrapUser(tx: SeedClient, roleId: bigint): Promise<void> {
  const bootstrapEmail = getBootstrapEmail();
  if (!bootstrapEmail) {
    return;
  }

  const appUser = await tx.appUser.findUnique({ where: { email: bootstrapEmail } });
  if (!appUser) {
    console.warn(
      `[seed] RBAC_BOOTSTRAP_EMAIL set to "${bootstrapEmail}" but no matching user exists; skipped assignment`,
    );
    return;
  }

  await tx.platformRoleAssignment.upsert({
    where: { appUserId_roleId: { appUserId: appUser.id, roleId } },
    update: {},
    create: { appUserId: appUser.id, roleId },
  });
}

/**
 * Seeds the canonical RBAC bootstrap catalog.
 *
 * Ownership rules:
 * - Permissions are code-owned: `RBAC_PERMISSION_CATALOG` is the source of
 *   truth, so metadata is synchronized on every run and keys that are no longer
 *   defined in the catalog are removed.
 * - `PLATFORM_ADMIN` is the system baseline: it is always synchronized to every
 *   PLATFORM permission so platform operators cannot lock themselves out.
 * - Every other default role is a create-only preset: it is created with its
 *   canonical permission set when missing, and an existing role's permission
 *   mappings, name and description are never overwritten.
 * - `RBAC_BOOTSTRAP_EMAIL` only ever assigns `PLATFORM_ADMIN`.
 */
export async function seedRbacBootstrap(prisma: PrismaClient): Promise<void> {
  validateRbacCatalog();

  await prisma.$transaction(
    async (tx) => {
      const permissionIdByKey = await syncPermissions(tx);

      const platformAdminPreset = requirePreset(DEFAULT_PLATFORM_ROLES, PLATFORM_ADMIN_ROLE_KEY);
      const platformAdminRoleId = await upsertSystemRole(tx, platformAdminPreset);
      await syncRolePermissions(
        tx,
        platformAdminRoleId,
        ALL_PLATFORM_PERMISSION_KEYS,
        permissionIdByKey,
      );

      for (const preset of [...DEFAULT_PLATFORM_ROLES, ...DEFAULT_GLOBAL_AGENCY_ROLES]) {
        if (preset.key === PLATFORM_ADMIN_ROLE_KEY) {
          continue;
        }
        const existing = await tx.role.findFirst({
          where: { scope: preset.scope, key: preset.key, agencyId: null },
          select: { id: true },
        });
        if (existing) {
          continue;
        }
        const created = await tx.role.create({
          data: {
            key: preset.key,
            name: preset.name,
            scope: preset.scope,
            agencyId: null,
            description: preset.description,
          },
        });
        await syncRolePermissions(tx, created.id, preset.permissionKeys, permissionIdByKey);
      }

      await assignBootstrapUser(tx, platformAdminRoleId);
    },
    { timeout: 60_000 },
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL as string }),
  });
  try {
    await seedRbacBootstrap(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (
  import.meta.url === new URL(`file://${process.argv[1]}`).href ||
  import.meta.url.endsWith(process.argv[1] ?? '')
) {
  void main();
}
