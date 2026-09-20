export const ROLE_SCOPES = ['PLATFORM', 'AGENCY'] as const;

export type RoleScope = (typeof ROLE_SCOPES)[number];

export type PermissionScope = RoleScope;

export const PERMISSION_RESOURCES = [
  'USER',
  'ROLE',
  'ROLE_PERMISSION',
  'USER_ROLE',
  'AGENCY_ROLE',
  'AGENCY_ROLE_PERMISSION',
  'AGENCY',
  'AGENCY_STATUS',
  'AGENCY_APPLICATION',
  'COUNTRY',
  'CITY',
  'CITY_REQUEST',
  'AUDIT',
  'MEMBER',
  'MEMBER_ROLE',
  'CUSTOMER',
  'TOUR',
  'DEPARTURE',
  'PRICING',
  'EXTRA_SERVICE',
  'BOOKING',
  'PAYMENT',
  'REFUND',
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const PERMISSION_ACTIONS = [
  'VIEW',
  'CREATE',
  'UPDATE',
  'DISABLE',
  'DELETE',
  'MANAGE',
  'APPROVE',
  'REJECT',
  'INVITE',
  'REMOVE',
  'ARCHIVE',
  'PUBLISH',
  'CANCEL',
  'ADJUST',
  'RECORD',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface PermissionCatalogEntry {
  key: string;
  name: string;
  description: string;
  scope: PermissionScope;
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * A default bootstrap role: the canonical permission set the platform ships for
 * a role key. Presets are code-owned definitions; the seed applies them
 * according to the documented ownership rules (see `prisma/seed.ts`).
 */
export interface RolePreset {
  key: string;
  name: string;
  description: string;
  scope: RoleScope;
  permissionKeys: readonly string[];
  /**
   * Protected system identity for this preset (`role.system_key`), or absent
   * for an ordinary preset. It marks a role the platform's own invariants
   * depend on; it is NOT an authorization mechanism — authorization stays on
   * `permission.key`. See `SYSTEM_ROLE_KEYS`.
   */
  systemKey?: SystemRoleKey;
}

/**
 * Protected system role identities. Deliberately minimal: an identity is added
 * here only when a domain invariant must be able to point at exactly one role
 * without depending on editable `key`/`name` metadata.
 *
 * `AGENCY_ADMIN` is the canonical global agency role every agency OWNER must
 * hold. It is the authorization bundle, not ownership itself: an EMPLOYEE may
 * hold it too, and holding it never makes anyone an owner.
 */
export const SYSTEM_ROLE_KEYS = ['AGENCY_ADMIN'] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

/** Required shape of each system role, mirrored by `role_system_key_shape_check`. */
export const SYSTEM_ROLE_SHAPES: Readonly<Record<SystemRoleKey, { scope: RoleScope }>> = {
  AGENCY_ADMIN: { scope: 'AGENCY' },
};

export interface RoleResponse {
  id: string;
  name: string;
  /**
   * Stable technical identifier (uppercase snake case), set on creation and
   * immutable afterwards. Uniqueness is scoped like `name`.
   */
  key: string;
  scope: RoleScope;
  /**
   * Ownership discriminator. Null means the role is global: a PLATFORM role or a
   * Platform-Admin-managed Global Agency role. A value means a Custom Agency role
   * owned by that agency.
   */
  agencyId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  key: string;
  name: string;
  description: string | null;
  scope: PermissionScope;
  resource: string;
  action: string;
  createdAt: string;
}

export interface ReplaceRolePermissionsResponse {
  roleId: string;
  permissionKeys: string[];
}
