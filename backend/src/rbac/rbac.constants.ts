import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  ROLE_SCOPES,
  SYSTEM_ROLE_KEYS,
  SYSTEM_ROLE_SHAPES,
  type PermissionAction,
  type PermissionCatalogEntry,
  type PermissionResource,
  type PermissionScope,
  type RolePreset,
  type SystemRoleKey,
} from './rbac.types.js';

function permission(
  key: string,
  name: string,
  scope: PermissionScope,
  resource: PermissionResource,
  action: PermissionAction,
  description: string = name,
): PermissionCatalogEntry {
  return { key, name, description, scope, resource, action };
}

function preset(
  key: string,
  name: string,
  description: string,
  scope: RolePreset['scope'],
  permissionKeys: readonly string[],
  systemKey?: RolePreset['systemKey'],
): RolePreset {
  return { key, name, description, scope, permissionKeys, ...(systemKey ? { systemKey } : {}) };
}

/**
 * Code-owned RBAC permission catalog.
 *
 * Permissions are never created, renamed or deleted through the API: this array
 * is the single source of truth and `prisma db seed` synchronizes the database
 * rows (key, name, description, scope, resource, action) from it. Every key is
 * derived from its scope, resource and action: `<SCOPE>_<RESOURCE>_<ACTION>`.
 */
export const RBAC_PERMISSION_CATALOG: ReadonlyArray<PermissionCatalogEntry> = [
  // PLATFORM — platform users.
  permission('PLATFORM_USER_VIEW', 'View platform users', 'PLATFORM', 'USER', 'VIEW'),
  permission('PLATFORM_USER_CREATE', 'Create platform users', 'PLATFORM', 'USER', 'CREATE'),
  permission('PLATFORM_USER_UPDATE', 'Update platform users', 'PLATFORM', 'USER', 'UPDATE'),
  permission(
    'PLATFORM_USER_DISABLE',
    'Disable platform users',
    'PLATFORM',
    'USER',
    'DISABLE',
    'Disable or reactivate platform users',
  ),

  // PLATFORM — platform roles.
  permission(
    'PLATFORM_ROLE_VIEW',
    'View platform roles',
    'PLATFORM',
    'ROLE',
    'VIEW',
    'List and view platform roles and their permission sets',
  ),
  permission('PLATFORM_ROLE_CREATE', 'Create platform roles', 'PLATFORM', 'ROLE', 'CREATE'),
  permission(
    'PLATFORM_ROLE_UPDATE',
    'Update platform roles',
    'PLATFORM',
    'ROLE',
    'UPDATE',
    'Update platform role names and descriptions',
  ),
  permission(
    'PLATFORM_ROLE_DELETE',
    'Delete platform roles',
    'PLATFORM',
    'ROLE',
    'DELETE',
    'Delete platform roles that are not assigned to any user',
  ),
  permission(
    'PLATFORM_ROLE_PERMISSION_MANAGE',
    'Manage platform role permissions',
    'PLATFORM',
    'ROLE_PERMISSION',
    'MANAGE',
    'Replace the permission set of a platform role',
  ),

  // PLATFORM — platform user role assignments.
  permission(
    'PLATFORM_USER_ROLE_VIEW',
    'View platform role assignments',
    'PLATFORM',
    'USER_ROLE',
    'VIEW',
    'List and view platform role assignments',
  ),
  permission(
    'PLATFORM_USER_ROLE_MANAGE',
    'Manage platform role assignments',
    'PLATFORM',
    'USER_ROLE',
    'MANAGE',
    'Assign and remove platform roles for platform users',
  ),

  // PLATFORM — Global Agency roles.
  permission(
    'PLATFORM_AGENCY_ROLE_VIEW',
    'View global agency roles',
    'PLATFORM',
    'AGENCY_ROLE',
    'VIEW',
    'List and view Global Agency roles and their permission sets',
  ),
  permission(
    'PLATFORM_AGENCY_ROLE_CREATE',
    'Create global agency roles',
    'PLATFORM',
    'AGENCY_ROLE',
    'CREATE',
  ),
  permission(
    'PLATFORM_AGENCY_ROLE_UPDATE',
    'Update global agency roles',
    'PLATFORM',
    'AGENCY_ROLE',
    'UPDATE',
  ),
  permission(
    'PLATFORM_AGENCY_ROLE_DELETE',
    'Delete global agency roles',
    'PLATFORM',
    'AGENCY_ROLE',
    'DELETE',
  ),
  permission(
    'PLATFORM_AGENCY_ROLE_PERMISSION_MANAGE',
    'Manage global agency role permissions',
    'PLATFORM',
    'AGENCY_ROLE_PERMISSION',
    'MANAGE',
    'Replace the permission set of a Global Agency role',
  ),

  // PLATFORM — agencies.
  permission('PLATFORM_AGENCY_VIEW', 'View agencies', 'PLATFORM', 'AGENCY', 'VIEW'),
  permission('PLATFORM_AGENCY_CREATE', 'Create agencies', 'PLATFORM', 'AGENCY', 'CREATE'),
  permission('PLATFORM_AGENCY_UPDATE', 'Update agencies', 'PLATFORM', 'AGENCY', 'UPDATE'),
  permission(
    'PLATFORM_AGENCY_STATUS_MANAGE',
    'Manage agency status',
    'PLATFORM',
    'AGENCY_STATUS',
    'MANAGE',
    'Suspend, reactivate and otherwise manage the platform status of an agency',
  ),

  // PLATFORM — agency applications.
  permission(
    'PLATFORM_AGENCY_APPLICATION_VIEW',
    'View agency applications',
    'PLATFORM',
    'AGENCY_APPLICATION',
    'VIEW',
  ),
  permission(
    'PLATFORM_AGENCY_APPLICATION_APPROVE',
    'Approve agency applications',
    'PLATFORM',
    'AGENCY_APPLICATION',
    'APPROVE',
  ),
  permission(
    'PLATFORM_AGENCY_APPLICATION_REJECT',
    'Reject agency applications',
    'PLATFORM',
    'AGENCY_APPLICATION',
    'REJECT',
  ),

  // PLATFORM — countries.
  permission('PLATFORM_COUNTRY_VIEW', 'View countries', 'PLATFORM', 'COUNTRY', 'VIEW'),
  permission('PLATFORM_COUNTRY_MANAGE', 'Manage countries', 'PLATFORM', 'COUNTRY', 'MANAGE'),

  // PLATFORM — cities.
  permission('PLATFORM_CITY_VIEW', 'View cities', 'PLATFORM', 'CITY', 'VIEW'),
  permission('PLATFORM_CITY_MANAGE', 'Manage cities', 'PLATFORM', 'CITY', 'MANAGE'),

  // PLATFORM — city requests.
  permission(
    'PLATFORM_CITY_REQUEST_VIEW',
    'View city requests',
    'PLATFORM',
    'CITY_REQUEST',
    'VIEW',
  ),
  permission(
    'PLATFORM_CITY_REQUEST_APPROVE',
    'Approve city requests',
    'PLATFORM',
    'CITY_REQUEST',
    'APPROVE',
  ),
  permission(
    'PLATFORM_CITY_REQUEST_REJECT',
    'Reject city requests',
    'PLATFORM',
    'CITY_REQUEST',
    'REJECT',
  ),

  // PLATFORM — audit.
  permission('PLATFORM_AUDIT_VIEW', 'View platform audit logs', 'PLATFORM', 'AUDIT', 'VIEW'),

  // AGENCY — agency members.
  permission('AGENCY_MEMBER_VIEW', 'View agency members', 'AGENCY', 'MEMBER', 'VIEW'),
  permission('AGENCY_MEMBER_INVITE', 'Invite agency members', 'AGENCY', 'MEMBER', 'INVITE'),
  permission('AGENCY_MEMBER_UPDATE', 'Update agency members', 'AGENCY', 'MEMBER', 'UPDATE'),
  permission('AGENCY_MEMBER_REMOVE', 'Remove agency members', 'AGENCY', 'MEMBER', 'REMOVE'),
  permission(
    'AGENCY_MEMBER_ROLE_MANAGE',
    'Manage agency member roles',
    'AGENCY',
    'MEMBER_ROLE',
    'MANAGE',
    'Assign and remove agency roles for agency members',
  ),

  // AGENCY — custom agency roles.
  permission('AGENCY_ROLE_VIEW', 'View agency roles', 'AGENCY', 'ROLE', 'VIEW'),
  permission('AGENCY_ROLE_CREATE', 'Create agency roles', 'AGENCY', 'ROLE', 'CREATE'),
  permission('AGENCY_ROLE_UPDATE', 'Update agency roles', 'AGENCY', 'ROLE', 'UPDATE'),
  permission('AGENCY_ROLE_DELETE', 'Delete agency roles', 'AGENCY', 'ROLE', 'DELETE'),
  permission(
    'AGENCY_ROLE_PERMISSION_MANAGE',
    'Manage agency role permissions',
    'AGENCY',
    'ROLE_PERMISSION',
    'MANAGE',
    'Replace the permission set of a custom agency role',
  ),

  // AGENCY — customers.
  permission('AGENCY_CUSTOMER_VIEW', 'View customers', 'AGENCY', 'CUSTOMER', 'VIEW'),
  permission('AGENCY_CUSTOMER_CREATE', 'Create customers', 'AGENCY', 'CUSTOMER', 'CREATE'),
  permission('AGENCY_CUSTOMER_UPDATE', 'Update customers', 'AGENCY', 'CUSTOMER', 'UPDATE'),
  permission('AGENCY_CUSTOMER_ARCHIVE', 'Archive customers', 'AGENCY', 'CUSTOMER', 'ARCHIVE'),

  // AGENCY — tours.
  permission('AGENCY_TOUR_VIEW', 'View tours', 'AGENCY', 'TOUR', 'VIEW'),
  permission('AGENCY_TOUR_CREATE', 'Create tours', 'AGENCY', 'TOUR', 'CREATE'),
  permission('AGENCY_TOUR_UPDATE', 'Update tours', 'AGENCY', 'TOUR', 'UPDATE'),
  permission('AGENCY_TOUR_DELETE', 'Delete tours', 'AGENCY', 'TOUR', 'DELETE'),
  permission('AGENCY_TOUR_PUBLISH', 'Publish tours', 'AGENCY', 'TOUR', 'PUBLISH'),

  // AGENCY — departures.
  permission('AGENCY_DEPARTURE_VIEW', 'View departures', 'AGENCY', 'DEPARTURE', 'VIEW'),
  permission('AGENCY_DEPARTURE_CREATE', 'Create departures', 'AGENCY', 'DEPARTURE', 'CREATE'),
  permission('AGENCY_DEPARTURE_UPDATE', 'Update departures', 'AGENCY', 'DEPARTURE', 'UPDATE'),
  permission('AGENCY_DEPARTURE_DELETE', 'Delete departures', 'AGENCY', 'DEPARTURE', 'DELETE'),

  // AGENCY — pricing.
  permission('AGENCY_PRICING_VIEW', 'View pricing', 'AGENCY', 'PRICING', 'VIEW'),
  permission('AGENCY_PRICING_MANAGE', 'Manage pricing', 'AGENCY', 'PRICING', 'MANAGE'),

  // AGENCY — extra services.
  permission(
    'AGENCY_EXTRA_SERVICE_VIEW',
    'View extra services',
    'AGENCY',
    'EXTRA_SERVICE',
    'VIEW',
  ),
  permission(
    'AGENCY_EXTRA_SERVICE_MANAGE',
    'Manage extra services',
    'AGENCY',
    'EXTRA_SERVICE',
    'MANAGE',
  ),

  // AGENCY — bookings.
  permission('AGENCY_BOOKING_VIEW', 'View bookings', 'AGENCY', 'BOOKING', 'VIEW'),
  permission('AGENCY_BOOKING_CREATE', 'Create bookings', 'AGENCY', 'BOOKING', 'CREATE'),
  permission('AGENCY_BOOKING_UPDATE', 'Update bookings', 'AGENCY', 'BOOKING', 'UPDATE'),
  permission('AGENCY_BOOKING_CANCEL', 'Cancel bookings', 'AGENCY', 'BOOKING', 'CANCEL'),
  permission('AGENCY_BOOKING_ADJUST', 'Adjust bookings', 'AGENCY', 'BOOKING', 'ADJUST'),

  // AGENCY — payments.
  permission('AGENCY_PAYMENT_VIEW', 'View payments', 'AGENCY', 'PAYMENT', 'VIEW'),
  permission('AGENCY_PAYMENT_RECORD', 'Record payments', 'AGENCY', 'PAYMENT', 'RECORD'),

  // AGENCY — refunds.
  permission('AGENCY_REFUND_VIEW', 'View refunds', 'AGENCY', 'REFUND', 'VIEW'),
  permission('AGENCY_REFUND_CREATE', 'Create refunds', 'AGENCY', 'REFUND', 'CREATE'),

  // AGENCY — city requests.
  permission('AGENCY_CITY_REQUEST_CREATE', 'Request a city', 'AGENCY', 'CITY_REQUEST', 'CREATE'),

  // AGENCY — audit.
  permission('AGENCY_AUDIT_VIEW', 'View agency audit logs', 'AGENCY', 'AUDIT', 'VIEW'),
];

const CATALOG_BY_KEY = new Map(
  RBAC_PERMISSION_CATALOG.map((entry) => [entry.key, entry] as const),
);

export const ALL_PLATFORM_PERMISSION_KEYS: readonly string[] = RBAC_PERMISSION_CATALOG.filter(
  (entry) => entry.scope === 'PLATFORM',
).map((entry) => entry.key);

export const ALL_AGENCY_PERMISSION_KEYS: readonly string[] = RBAC_PERMISSION_CATALOG.filter(
  (entry) => entry.scope === 'AGENCY',
).map((entry) => entry.key);

export const PLATFORM_ADMIN_ROLE_KEY = 'PLATFORM_ADMIN';
export const AGENCY_OWNER_ROLE_KEY = 'AGENCY_OWNER';

/**
 * Protected system identity of the canonical global agency role (the role every
 * agency OWNER must hold). Ownership invariants resolve the role by this value,
 * never by `key` or `name`, which stay editable business metadata.
 *
 * This is NOT an authorization mechanism: nothing is ever granted because a role
 * carries a `systemKey`. Authorization remains `permission.key` only.
 */
export const AGENCY_ADMIN_SYSTEM_KEY: SystemRoleKey = 'AGENCY_ADMIN';

/**
 * Default PLATFORM roles. `PLATFORM_ADMIN` is the system baseline and is always
 * synchronized to the full PLATFORM catalog; the other presets are seeded once
 * and are never overwritten afterwards.
 */
export const DEFAULT_PLATFORM_ROLES: ReadonlyArray<RolePreset> = [
  preset(
    PLATFORM_ADMIN_ROLE_KEY,
    'Platform Admin',
    'Full platform administration, including every PLATFORM permission',
    'PLATFORM',
    ALL_PLATFORM_PERMISSION_KEYS,
  ),
  preset(
    'PLATFORM_IDENTITY_ADMIN',
    'Identity Admin',
    'Manage platform users, roles, role assignments and agency lifecycle',
    'PLATFORM',
    [
      'PLATFORM_USER_VIEW',
      'PLATFORM_USER_CREATE',
      'PLATFORM_USER_UPDATE',
      'PLATFORM_USER_DISABLE',
      'PLATFORM_ROLE_VIEW',
      'PLATFORM_ROLE_CREATE',
      'PLATFORM_ROLE_UPDATE',
      'PLATFORM_ROLE_DELETE',
      'PLATFORM_ROLE_PERMISSION_MANAGE',
      'PLATFORM_USER_ROLE_VIEW',
      'PLATFORM_USER_ROLE_MANAGE',
      'PLATFORM_AGENCY_VIEW',
      'PLATFORM_AGENCY_CREATE',
      'PLATFORM_AGENCY_UPDATE',
      'PLATFORM_AGENCY_STATUS_MANAGE',
      'PLATFORM_AUDIT_VIEW',
    ],
  ),
  preset(
    'PLATFORM_AGENCY_ADMIN',
    'Agency Admin',
    'Review agency applications, manage Global Agency roles and city requests',
    'PLATFORM',
    [
      'PLATFORM_AGENCY_VIEW',
      'PLATFORM_AGENCY_CREATE',
      'PLATFORM_AGENCY_UPDATE',
      'PLATFORM_AGENCY_STATUS_MANAGE',
      'PLATFORM_AGENCY_APPLICATION_VIEW',
      'PLATFORM_AGENCY_APPLICATION_APPROVE',
      'PLATFORM_AGENCY_APPLICATION_REJECT',
      'PLATFORM_AGENCY_ROLE_VIEW',
      'PLATFORM_AGENCY_ROLE_CREATE',
      'PLATFORM_AGENCY_ROLE_UPDATE',
      'PLATFORM_AGENCY_ROLE_DELETE',
      'PLATFORM_AGENCY_ROLE_PERMISSION_MANAGE',
      'PLATFORM_CITY_REQUEST_VIEW',
      'PLATFORM_CITY_REQUEST_APPROVE',
      'PLATFORM_CITY_REQUEST_REJECT',
      'PLATFORM_AUDIT_VIEW',
      'PLATFORM_CITY_VIEW',
    ],
  ),
  preset(
    'PLATFORM_CATALOG_MANAGER',
    'Catalog Manager',
    'Maintain countries, cities and city requests',
    'PLATFORM',
    [
      'PLATFORM_COUNTRY_VIEW',
      'PLATFORM_COUNTRY_MANAGE',
      'PLATFORM_CITY_VIEW',
      'PLATFORM_CITY_MANAGE',
      'PLATFORM_CITY_REQUEST_VIEW',
      'PLATFORM_CITY_REQUEST_APPROVE',
      'PLATFORM_CITY_REQUEST_REJECT',
    ],
  ),
  preset(
    'PLATFORM_SUPPORT_AGENT',
    'Support Agent',
    'Read-only access for supporting agencies and platform users',
    'PLATFORM',
    [
      'PLATFORM_USER_VIEW',
      'PLATFORM_USER_ROLE_VIEW',
      'PLATFORM_AGENCY_VIEW',
      'PLATFORM_AGENCY_APPLICATION_VIEW',
      'PLATFORM_AGENCY_ROLE_VIEW',
      'PLATFORM_COUNTRY_VIEW',
      'PLATFORM_CITY_VIEW',
      'PLATFORM_CITY_REQUEST_VIEW',
      'PLATFORM_AUDIT_VIEW',
    ],
  ),
];

const AGENCY_MANAGER_PERMISSION_KEYS = ALL_AGENCY_PERMISSION_KEYS.filter(
  (key) => key !== 'AGENCY_ROLE_DELETE',
);

/**
 * Default Global AGENCY roles (`scope=AGENCY`, `agencyId=null`). They are
 * templates an agency can adopt once agency membership and custom agency roles
 * exist. `AGENCY_OWNER` is the agency baseline and is always synchronized to the
 * full AGENCY catalog; the other presets are seeded once and are never
 * overwritten afterwards.
 */
export const DEFAULT_GLOBAL_AGENCY_ROLES: ReadonlyArray<RolePreset> = [
  preset(
    AGENCY_OWNER_ROLE_KEY,
    'Agency Owner',
    'Full access to the agency workspace, including every AGENCY permission',
    'AGENCY',
    ALL_AGENCY_PERMISSION_KEYS,
    // Carries the AGENCY_ADMIN protected system identity: this is the canonical
    // permission bundle every agency OWNER must hold. `key` stays
    // `AGENCY_OWNER` because it is editable business metadata; invariants point
    // at `systemKey` instead, which the database makes immutable.
    AGENCY_ADMIN_SYSTEM_KEY,
  ),
  preset(
    'AGENCY_MANAGER',
    'Agency Manager',
    'Manage the agency workspace except deleting agency roles',
    'AGENCY',
    AGENCY_MANAGER_PERMISSION_KEYS,
  ),
  preset(
    'AGENCY_BOOKING_AGENT',
    'Booking Agent',
    'Handle customers, bookings and payments',
    'AGENCY',
    [
      'AGENCY_MEMBER_VIEW',
      'AGENCY_CUSTOMER_VIEW',
      'AGENCY_CUSTOMER_CREATE',
      'AGENCY_CUSTOMER_UPDATE',
      'AGENCY_TOUR_VIEW',
      'AGENCY_DEPARTURE_VIEW',
      'AGENCY_PRICING_VIEW',
      'AGENCY_EXTRA_SERVICE_VIEW',
      'AGENCY_BOOKING_VIEW',
      'AGENCY_BOOKING_CREATE',
      'AGENCY_BOOKING_UPDATE',
      'AGENCY_BOOKING_CANCEL',
      'AGENCY_BOOKING_ADJUST',
      'AGENCY_PAYMENT_VIEW',
      'AGENCY_PAYMENT_RECORD',
    ],
  ),
  preset(
    'AGENCY_TOUR_MANAGER',
    'Tour Manager',
    'Manage tours, departures, pricing and extra services',
    'AGENCY',
    [
      'AGENCY_MEMBER_VIEW',
      'AGENCY_CUSTOMER_VIEW',
      'AGENCY_TOUR_VIEW',
      'AGENCY_TOUR_CREATE',
      'AGENCY_TOUR_UPDATE',
      'AGENCY_TOUR_DELETE',
      'AGENCY_TOUR_PUBLISH',
      'AGENCY_DEPARTURE_VIEW',
      'AGENCY_DEPARTURE_CREATE',
      'AGENCY_DEPARTURE_UPDATE',
      'AGENCY_DEPARTURE_DELETE',
      'AGENCY_PRICING_VIEW',
      'AGENCY_PRICING_MANAGE',
      'AGENCY_EXTRA_SERVICE_VIEW',
      'AGENCY_EXTRA_SERVICE_MANAGE',
      'AGENCY_CITY_REQUEST_CREATE',
    ],
  ),
  preset(
    'AGENCY_ACCOUNTANT',
    'Accountant',
    'Record payments, manage refunds and review financial activity',
    'AGENCY',
    [
      'AGENCY_CUSTOMER_VIEW',
      'AGENCY_BOOKING_VIEW',
      'AGENCY_PAYMENT_VIEW',
      'AGENCY_PAYMENT_RECORD',
      'AGENCY_REFUND_VIEW',
      'AGENCY_REFUND_CREATE',
      'AGENCY_AUDIT_VIEW',
    ],
  ),
  preset(
    'AGENCY_VIEWER',
    'Viewer',
    'Read-only access to the agency workspace',
    'AGENCY',
    [
      'AGENCY_MEMBER_VIEW',
      'AGENCY_CUSTOMER_VIEW',
      'AGENCY_TOUR_VIEW',
      'AGENCY_DEPARTURE_VIEW',
      'AGENCY_PRICING_VIEW',
      'AGENCY_EXTRA_SERVICE_VIEW',
      'AGENCY_BOOKING_VIEW',
      'AGENCY_PAYMENT_VIEW',
      'AGENCY_REFUND_VIEW',
      'AGENCY_AUDIT_VIEW',
      'AGENCY_ROLE_VIEW',
    ],
  ),
];

function assertSetEquals(label: string, actual: readonly string[], expected: readonly string[]): void {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((key) => !actualSet.has(key));
  const unexpected = actual.filter((key) => !expectedSet.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `[rbac] ${label} does not match the catalog. Missing: [${missing.join(', ')}]. ` +
        `Unexpected: [${unexpected.join(', ')}].`,
    );
  }
}

/**
 * Programmatic validation of the code-owned RBAC catalog and default role
 * presets. Runs at application startup, at seed time and from the test suite.
 * Throws on the first inconsistency instead of skipping malformed entries
 * silently.
 */
export function validateRbacCatalog(): void {
  const seenPermissionKeys = new Set<string>();
  for (const entry of RBAC_PERMISSION_CATALOG) {
    if (seenPermissionKeys.has(entry.key)) {
      throw new Error(`[rbac] Duplicate permission key "${entry.key}" in the catalog.`);
    }
    seenPermissionKeys.add(entry.key);

    if (!ROLE_SCOPES.includes(entry.scope)) {
      throw new Error(`[rbac] Permission "${entry.key}" has an unknown scope "${entry.scope}".`);
    }
    if (!PERMISSION_RESOURCES.includes(entry.resource)) {
      throw new Error(
        `[rbac] Permission "${entry.key}" has an unknown resource "${entry.resource}".`,
      );
    }
    if (!PERMISSION_ACTIONS.includes(entry.action)) {
      throw new Error(
        `[rbac] Permission "${entry.key}" has an unknown action "${entry.action}".`,
      );
    }

    const expectedKey = `${entry.scope}_${entry.resource}_${entry.action}`;
    if (entry.key !== expectedKey) {
      throw new Error(
        `[rbac] Permission key "${entry.key}" must equal "<SCOPE>_<RESOURCE>_<ACTION>" ` +
          `("${expectedKey}").`,
      );
    }
    if (entry.name.trim().length === 0 || entry.description.trim().length === 0) {
      throw new Error(`[rbac] Permission "${entry.key}" must define a name and a description.`);
    }
  }

  const presets = [...DEFAULT_PLATFORM_ROLES, ...DEFAULT_GLOBAL_AGENCY_ROLES];
  const seenRoleKeys = new Set<string>();
  for (const role of presets) {
    if (seenRoleKeys.has(role.key)) {
      throw new Error(`[rbac] Duplicate default role key "${role.key}".`);
    }
    seenRoleKeys.add(role.key);

    if (!ROLE_SCOPES.includes(role.scope)) {
      throw new Error(`[rbac] Default role "${role.key}" has an unknown scope "${role.scope}".`);
    }
    if (!role.key.startsWith(`${role.scope}_`)) {
      throw new Error(
        `[rbac] Default role "${role.key}" must start with its scope prefix "${role.scope}_".`,
      );
    }
    if (role.name.trim().length === 0 || role.description.trim().length === 0) {
      throw new Error(`[rbac] Default role "${role.key}" must define a name and a description.`);
    }

    const seenRolePermissionKeys = new Set<string>();
    for (const permissionKey of role.permissionKeys) {
      if (seenRolePermissionKeys.has(permissionKey)) {
        throw new Error(
          `[rbac] Default role "${role.key}" lists permission "${permissionKey}" more than once.`,
        );
      }
      seenRolePermissionKeys.add(permissionKey);

      const permissionEntry = CATALOG_BY_KEY.get(permissionKey);
      if (!permissionEntry) {
        throw new Error(
          `[rbac] Default role "${role.key}" references unknown permission "${permissionKey}".`,
        );
      }
      if (permissionEntry.scope !== role.scope) {
        throw new Error(
          `[rbac] Default role "${role.key}" (${role.scope}) references ${permissionEntry.scope} ` +
            `permission "${permissionKey}".`,
        );
      }
    }
  }

  // Protected system identities: known value, correct scope, and exactly one
  // preset per identity, so the seed can never establish two canonical roles.
  const seenSystemKeys = new Set<SystemRoleKey>();
  for (const role of presets) {
    if (role.systemKey === undefined) {
      continue;
    }
    if (!SYSTEM_ROLE_KEYS.includes(role.systemKey)) {
      throw new Error(
        `[rbac] Default role "${role.key}" declares unknown system key "${role.systemKey}".`,
      );
    }
    if (seenSystemKeys.has(role.systemKey)) {
      throw new Error(
        `[rbac] System key "${role.systemKey}" is declared by more than one default role.`,
      );
    }
    seenSystemKeys.add(role.systemKey);

    const expectedScope = SYSTEM_ROLE_SHAPES[role.systemKey].scope;
    if (role.scope !== expectedScope) {
      throw new Error(
        `[rbac] System role "${role.systemKey}" must be ${expectedScope}-scoped, ` +
          `but "${role.key}" is ${role.scope}.`,
      );
    }
  }

  for (const systemKey of SYSTEM_ROLE_KEYS) {
    if (!seenSystemKeys.has(systemKey)) {
      throw new Error(`[rbac] No default role declares the required system key "${systemKey}".`);
    }
  }

  const platformAdmin = DEFAULT_PLATFORM_ROLES.find((role) => role.key === PLATFORM_ADMIN_ROLE_KEY);
  const agencyOwner = DEFAULT_GLOBAL_AGENCY_ROLES.find(
    (role) => role.key === AGENCY_OWNER_ROLE_KEY,
  );
  assertSetEquals(
    `Default role "${PLATFORM_ADMIN_ROLE_KEY}"`,
    platformAdmin?.permissionKeys ?? [],
    ALL_PLATFORM_PERMISSION_KEYS,
  );
  assertSetEquals(
    `Default role "${AGENCY_OWNER_ROLE_KEY}"`,
    agencyOwner?.permissionKeys ?? [],
    ALL_AGENCY_PERMISSION_KEYS,
  );
}
