import { ApiError } from '../../../services/api-error.ts';

export type AgencyAccessFailure =
  | 'suspended'
  | 'not-member'
  | 'inactive'
  | 'permission-denied'
  | 'not-found'
  | 'unexpected';

/** Maps the backend agency-guard errorCodes to a stable UI failure kind. */
export function classifyAgencyAccessError(error: unknown): AgencyAccessFailure {
  if (error instanceof ApiError && error.code) {
    switch (error.code) {
      case 'AGENCY_SUSPENDED':
        return 'suspended';
      case 'AGENCY_MEMBERSHIP_REQUIRED':
        return 'not-member';
      case 'AGENCY_MEMBERSHIP_INACTIVE':
        return 'inactive';
      case 'AGENCY_PERMISSION_DENIED':
        return 'permission-denied';
      case 'AGENCY_NOT_FOUND':
        return 'not-found';
      default:
        return 'unexpected';
    }
  }
  return 'unexpected';
}
