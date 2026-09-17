import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PLATFORM_ADMIN_ROLE, RBAC_PERMISSION_CATALOG } from '../src/rbac/rbac.constants.js';

export const RBAC_BOOTSTRAP_EMAIL_ENV = 'RBAC_BOOTSTRAP_EMAIL';

/**
 * Optional explicit bootstrap user for a platform role assignment.
 * No personal email is hardcoded; assignment only happens when the variable
 * is provided AND the user already exists.
 */
export function getBootstrapEmail(): string | undefined {
  const email = process.env[RBAC_BOOTSTRAP_EMAIL_ENV]?.trim().toLowerCase();
  return email ? email : undefined;
}

export async function seedPlatformBootstrap(prisma: PrismaClient): Promise<void> {
  const permissionIds = new Map<string, bigint>();
  const catalogKeys = new Set(RBAC_PERMISSION_CATALOG.map((permission) => permission.key));

  for (const permission of RBAC_PERMISSION_CATALOG) {
    const row = await prisma.permission.upsert({
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
    permissionIds.set(permission.key, row.id);
  }

  const stalePermissions = await prisma.permission.findMany({
    where: { key: { notIn: [...catalogKeys] } },
    select: { key: true },
  });
  if (stalePermissions.length > 0) {
    await prisma.permission.deleteMany({
      where: { key: { in: stalePermissions.map((permission) => permission.key) } },
    });
  }

  const existingRole = await prisma.role.findFirst({
    where: {
      scope: PLATFORM_ADMIN_ROLE.scope,
      name: PLATFORM_ADMIN_ROLE.name,
      agencyId: null,
    },
  });
  const role = existingRole
    ? await prisma.role.update({
        where: { id: existingRole.id },
        data: { description: PLATFORM_ADMIN_ROLE.description },
      })
    : await prisma.role.create({
        data: { ...PLATFORM_ADMIN_ROLE, agencyId: null },
      });

  for (const { key } of RBAC_PERMISSION_CATALOG) {
    const permissionId = permissionIds.get(key);
    if (!permissionId) {
      throw new Error(`Missing permission id for ${key}`);
    }
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId } },
      update: {},
      create: { roleId: role.id, permissionId },
    });
  }

  const bootstrapEmail = getBootstrapEmail();
  if (bootstrapEmail) {
    const appUser = await prisma.appUser.findUnique({ where: { email: bootstrapEmail } });
    if (appUser) {
      await prisma.platformRoleAssignment.upsert({
        where: { appUserId_roleId: { appUserId: appUser.id, roleId: role.id } },
        update: {},
        create: { appUserId: appUser.id, roleId: role.id },
      });
    } else {
      console.warn(
        `[seed] RBAC_BOOTSTRAP_EMAIL set to "${bootstrapEmail}" but no matching user exists; skipped assignment`,
      );
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL as string }),
  });
  try {
    await seedPlatformBootstrap(prisma);
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