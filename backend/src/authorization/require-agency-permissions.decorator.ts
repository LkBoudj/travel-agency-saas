import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { ALL_AGENCY_PERMISSION_KEYS } from '../rbac/rbac.constants.js';

export const REQUIRE_AGENCY_PERMISSIONS_KEY = 'requireAgencyPermissions';

const AGENCY_PERMISSION_KEYS = new Set<string>(ALL_AGENCY_PERMISSION_KEYS);

/**
 * Declares the AGENCY permissions a handler requires, and marks the route as
 * agency-scoped so `AgencyPermissionGuard` resolves the agency context for it.
 *
 * It is deliberately separate from `@RequirePermissions`, which is PLATFORM
 * only: one decorator serving both scopes would make it impossible to tell, at
 * a glance, which tenancy a route is protected by.
 *
 * Keys are validated against the code-owned catalog at decoration time, i.e.
 * when the module is loaded. A typo, or a PLATFORM key used by mistake, fails
 * the application at boot rather than silently guarding a route with a
 * permission nobody can ever hold.
 */
export function RequireAgencyPermissions(...permissions: string[]): CustomDecorator<string> {
  if (permissions.length === 0) {
    throw new Error('[authz] @RequireAgencyPermissions requires at least one permission key.');
  }

  const unknown = permissions.filter((key) => !AGENCY_PERMISSION_KEYS.has(key));
  if (unknown.length > 0) {
    throw new Error(
      `[authz] @RequireAgencyPermissions received non-AGENCY permission key(s): ` +
        `${unknown.join(', ')}. Only keys from the AGENCY catalog can guard an ` +
        `agency-scoped route.`,
    );
  }

  return SetMetadata(REQUIRE_AGENCY_PERMISSIONS_KEY, permissions);
}

/**
 * Marks a route as agency-scoped without requiring a specific permission.
 *
 * Used by routes that only need a valid, ACTIVE membership in an operational
 * agency — the context endpoint is the one such case today. Authorization is
 * still real: agency existence, status and membership are all enforced.
 */
export const AGENCY_CONTEXT_ONLY_KEY = 'agencyContextOnly';

export function RequireAgencyMembership(): CustomDecorator<string> {
  return SetMetadata(AGENCY_CONTEXT_ONLY_KEY, true);
}
