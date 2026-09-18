import type { Prisma } from '../generated/prisma/client.js';

/**
 * AppUser account lifecycle statuses. The database CHECK constraint
 * `app_user_status_check` restricts `app_user.status` to these values.
 */
export const PLATFORM_USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export type PlatformUserStatus = (typeof PLATFORM_USER_STATUSES)[number];

/**
 * A minimal, presentation-ready reference to a Platform Role. The Role `key`
 * is the stable HTTP identifier for role assignment operations.
 */
export interface PlatformUserRoleRef {
  key: string;
  name: string;
}

export interface PlatformUserResponse {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: PlatformUserStatus;
  roles: PlatformUserRoleRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ReplacePlatformUserRolesResponse {
  code: string;
  roles: PlatformUserRoleRef[];
}

/**
 * Raw AppUser row plus its Platform Role assignments, as loaded everywhere in
 * this module. Deliberately excludes `passwordHash`.
 */
export type PlatformUserRow = Prisma.AppUserGetPayload<{
  select: typeof PLATFORM_USER_SELECT;
}>;

export const PLATFORM_USER_SELECT = {
  id: true,
  code: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  platformRoleAssignments: {
    select: { role: { select: { key: true, name: true } } },
    orderBy: { role: { name: 'asc' } },
  },
} as const satisfies Prisma.AppUserSelect;