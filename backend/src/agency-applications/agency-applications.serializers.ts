import type {
  AgencyApplicationAgencyRef,
  AgencyApplicationApplicant,
  AgencyApplicationResponse,
  AgencyApplicationReviewer,
  AgencyApplicationRow,
} from './agency-applications.types.js';
import type { AgencyApplicationStatus } from './agency-applications.schemas.js';

function toApplicant(user: AgencyApplicationRow['appUser']): AgencyApplicationApplicant {
  return {
    code: user.code,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toReviewer(user: AgencyApplicationRow['reviewedBy']): AgencyApplicationReviewer | null {
  if (!user) {
    return null;
  }
  return {
    code: user.code,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function toAgencyRef(agency: AgencyApplicationRow['agency']): AgencyApplicationAgencyRef | null {
  if (!agency) {
    return null;
  }
  return {
    code: agency.code,
    name: agency.name,
    status: agency.status,
  };
}

/** Maps a raw AgencyApplication row to its API response shape (no Prisma internals). */
export function toAgencyApplicationResponse(
  application: AgencyApplicationRow,
): AgencyApplicationResponse {
  return {
    id: application.id.toString(),
    agencyName: application.agencyName,
    country: application.country,
    website: application.website,
    description: application.description,
    status: application.status as AgencyApplicationStatus,
    reviewNote: application.reviewNote,
    applicant: toApplicant(application.appUser),
    reviewedBy: toReviewer(application.reviewedBy),
    reviewedAt: application.reviewedAt ? application.reviewedAt.toISOString() : null,
    agency: toAgencyRef(application.agency),
    approvedAt: application.approvedAt ? application.approvedAt.toISOString() : null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}
