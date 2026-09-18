import type { Prisma } from '../generated/prisma/client.js';

/**
 * The agency owner as the platform exposes it. Identified by `AppUser.code`
 * (the project's stable external identifier) so a future Platform Admin UI can
 * link straight to the user's details without ever seeing a database id.
 */
export interface AgencyOwnerRef {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** AppUser identity status (ACTIVE | SUSPENDED) — not the membership status. */
  status: string;
}

export interface AgencyResponse {
  code: string;
  name: string;
  status: string;
  country: string | null;
  description: string | null;
  /**
   * Derived from the OWNER membership, never stored on the agency. Null is only
   * reachable for data that predates the ownership invariants.
   */
  owner: AgencyOwnerRef | null;
  /** Derived aggregate over AgencyMembership. Never a stored counter. */
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agency details. Today it carries the same fields as the list row plus the
 * linked application reference; Members/Customers tabs are later slices and no
 * placeholder data is invented for them here.
 */
export interface AgencyDetailsResponse extends AgencyResponse {
  /** Id of the approved application this agency came from, when applicable. */
  applicationId: string | null;
}

/**
 * One membership row is enough to resolve the owner: the database guarantees
 * exactly one OWNER per agency.
 */
export const AGENCY_OWNER_INCLUDE = {
  where: { membershipType: 'OWNER' },
  take: 1,
  select: {
    appUser: {
      select: { code: true, email: true, firstName: true, lastName: true, status: true },
    },
  },
} as const;

export const AGENCY_SELECT = {
  code: true,
  name: true,
  status: true,
  country: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  members: AGENCY_OWNER_INCLUDE,
  _count: { select: { members: true } },
} as const satisfies Prisma.AgencySelect;

export const AGENCY_DETAILS_SELECT = {
  ...AGENCY_SELECT,
  applications: {
    where: { status: 'APPROVED' },
    take: 1,
    select: { id: true },
  },
} as const satisfies Prisma.AgencySelect;

export type AgencyRow = Prisma.AgencyGetPayload<{ select: typeof AGENCY_SELECT }>;
export type AgencyDetailsRow = Prisma.AgencyGetPayload<{ select: typeof AGENCY_DETAILS_SELECT }>;
