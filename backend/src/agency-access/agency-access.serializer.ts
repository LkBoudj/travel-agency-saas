import type { AgencyAccessContext } from '../authorization/agency-access.js';

export interface AgencyAccessResponse {
  agency: { code: string; name: string; status: string };
  membership: { membershipType: string; status: string };
  roles: Array<{ key: string; name: string }>;
  permissions: string[];
}

/**
 * Projects the resolved context onto the HTTP contract.
 *
 * Explicitly field-by-field rather than by spreading, so the internal agency
 * and membership ids in the context can never leak, and so adding an internal
 * field later cannot silently widen the response. `systemKey` and
 * role-permission internals are not part of the context at all.
 */
export function toAgencyAccessResponse(access: AgencyAccessContext): AgencyAccessResponse {
  return {
    agency: {
      code: access.agency.code,
      name: access.agency.name,
      status: access.agency.status,
    },
    membership: {
      membershipType: access.membership.membershipType,
      status: access.membership.status,
    },
    roles: access.roles.map((role) => ({ key: role.key, name: role.name })),
    permissions: [...access.permissionKeys],
  };
}
