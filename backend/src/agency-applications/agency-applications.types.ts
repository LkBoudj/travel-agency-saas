import type { Prisma } from '../generated/prisma/client.js';
import type { AgencyApplicationStatus } from './agency-applications.schemas.js';

/** Minimal reference to the applicant of an application. */
export interface AgencyApplicationApplicant {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Minimal reference to the platform admin who reviewed an application. */
export interface AgencyApplicationReviewer {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Reference to the agency created by an approved application. */
export interface AgencyApplicationAgencyRef {
  code: string;
  name: string;
  status: string;
}

/**
 * AgencyApplication as returned by the API. The database `id` is serialized to
 * a string (opaque BigInt reference used in URLs); no internal columns
 * (`appUserId`, `reviewedByAppUserId` raw ids) are exposed.
 */
export interface AgencyApplicationResponse {
  id: string;
  agencyName: string;
  country: string | null;
  website: string | null;
  description: string | null;
  status: AgencyApplicationStatus;
  reviewNote: string | null;
  applicant: AgencyApplicationApplicant;
  reviewedBy: AgencyApplicationReviewer | null;
  reviewedAt: string | null;
  agency: AgencyApplicationAgencyRef | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw application row as loaded everywhere in this module, including the
 * nested applicant/reviewer/agency references required by the serializers.
 */
export type AgencyApplicationRow = Prisma.AgencyApplicationGetPayload<{
  select: typeof AGENCY_APPLICATION_SELECT;
}>;

export const AGENCY_APPLICATION_SELECT = {
  id: true,
  agencyName: true,
  country: true,
  website: true,
  description: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  appUser: {
    select: { id: true, code: true, email: true, firstName: true, lastName: true },
  },
  reviewedBy: {
    select: { code: true, email: true, firstName: true, lastName: true },
  },
  agency: {
    select: { code: true, name: true, status: true },
  },
} as const satisfies Prisma.AgencyApplicationSelect;
