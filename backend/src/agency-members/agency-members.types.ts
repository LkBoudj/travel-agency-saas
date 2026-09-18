import type { Prisma } from '../generated/prisma/client.js';

/** An AGENCY role as exposed to an agency member surface. */
export interface AgencyMemberRoleRef {
  key: string;
  name: string;
}

/**
 * A member of ONE agency.
 *
 * `accountStatus` is the AppUser's identity status across the whole product;
 * `membershipStatus` is access to this agency alone. They are deliberately two
 * separate fields, because an ACTIVE account can hold a SUSPENDED membership
 * here while staying active elsewhere.
 *
 * No database id, no `passwordHash`, no `systemKey`, no platform roles and no
 * membership in any other agency is ever part of this shape.
 */
export interface AgencyMemberResponse {
  code: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  accountStatus: string;
  membershipType: string;
  membershipStatus: string;
  roles: AgencyMemberRoleRef[];
  joinedAt: string;
}

/** An assignable role: global agency roles plus this agency's own custom ones. */
export interface AssignableAgencyRoleResponse {
  key: string;
  name: string;
  description: string | null;
}

/**
 * Everything a member row needs, in one shape. Role rows carry `scope` and
 * `agencyId` so the service can re-apply the tenancy filter when projecting,
 * rather than trusting whatever the assignment table happens to hold.
 */
export const AGENCY_MEMBER_SELECT = {
  id: true,
  membershipType: true,
  status: true,
  createdAt: true,
  appUser: {
    select: {
      code: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
  },
  agencyRoleAssignments: {
    select: {
      role: { select: { key: true, name: true, scope: true, agencyId: true } },
    },
  },
} as const satisfies Prisma.AgencyMembershipSelect;

export type AgencyMemberRow = Prisma.AgencyMembershipGetPayload<{
  select: typeof AGENCY_MEMBER_SELECT;
}>;
