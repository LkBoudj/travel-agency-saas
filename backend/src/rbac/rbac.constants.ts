import type { PermissionCatalogEntry } from './rbac.types.js';

/**
 * Code-owned Platform permission catalog.
 *
 * Permissions are never created, renamed or deleted through the API: this array
 * is the single source of truth and `prisma db seed` synchronizes the database
 * rows (key, name, description, scope, resource, action) from it. Every key is
 * derived from its scope, resource and action: `<SCOPE>_<RESOURCE>_<ACTION>`.
 *
 * Keep this list PLATFORM-only until Agency-scoped permissions are a real
 * product requirement. `RBAC_PERMISSION_CATALOG` intentionally contains only
 * PLATFORM permissions at this milestone.
 */
export const RBAC_PERMISSION_CATALOG: ReadonlyArray<PermissionCatalogEntry> = [
  {
    key: 'PLATFORM_USER_VIEW',
    name: 'View platform users',
    description: 'View platform users',
    scope: 'PLATFORM',
    resource: 'USER',
    action: 'VIEW',
  },
  {
    key: 'PLATFORM_USER_CREATE',
    name: 'Create platform users',
    description: 'Create platform users',
    scope: 'PLATFORM',
    resource: 'USER',
    action: 'CREATE',
  },
  {
    key: 'PLATFORM_USER_UPDATE',
    name: 'Update platform users',
    description: 'Update platform users',
    scope: 'PLATFORM',
    resource: 'USER',
    action: 'UPDATE',
  },
  {
    key: 'PLATFORM_USER_DISABLE',
    name: 'Disable platform users',
    description: 'Disable platform users',
    scope: 'PLATFORM',
    resource: 'USER',
    action: 'DISABLE',
  },
  {
    key: 'PLATFORM_ROLE_VIEW',
    name: 'View platform roles',
    description: 'List and view platform roles and their permission sets',
    scope: 'PLATFORM',
    resource: 'ROLE',
    action: 'VIEW',
  },
  {
    key: 'PLATFORM_ROLE_CREATE',
    name: 'Create platform roles',
    description: 'Create platform roles',
    scope: 'PLATFORM',
    resource: 'ROLE',
    action: 'CREATE',
  },
  {
    key: 'PLATFORM_ROLE_UPDATE',
    name: 'Update platform roles',
    description: 'Update platform role names and descriptions',
    scope: 'PLATFORM',
    resource: 'ROLE',
    action: 'UPDATE',
  },
  {
    key: 'PLATFORM_ROLE_DELETE',
    name: 'Delete platform roles',
    description: 'Delete platform roles that are not assigned to any user',
    scope: 'PLATFORM',
    resource: 'ROLE',
    action: 'DELETE',
  },
  {
    key: 'PLATFORM_ROLE_PERMISSION_MANAGE',
    name: 'Manage platform role permissions',
    description: 'Replace the permission set of a platform role',
    scope: 'PLATFORM',
    resource: 'ROLE_PERMISSION',
    action: 'MANAGE',
  },
  {
    key: 'PLATFORM_USER_ROLE_VIEW',
    name: 'View platform role assignments',
    description: 'List and view platform role assignments',
    scope: 'PLATFORM',
    resource: 'USER_ROLE',
    action: 'VIEW',
  },
  {
    key: 'PLATFORM_USER_ROLE_MANAGE',
    name: 'Manage platform role assignments',
    description: 'Assign and remove platform roles for platform users',
    scope: 'PLATFORM',
    resource: 'USER_ROLE',
    action: 'MANAGE',
  },
];

export const PLATFORM_PERMISSION_CATALOG: ReadonlyArray<PermissionCatalogEntry> =
  RBAC_PERMISSION_CATALOG.filter((permission) => permission.scope === 'PLATFORM');

export const PLATFORM_ADMIN_ROLE = {
  name: 'PLATFORM_ADMIN',
  scope: 'PLATFORM',
  description: 'Platform super administrator',
} as const;
