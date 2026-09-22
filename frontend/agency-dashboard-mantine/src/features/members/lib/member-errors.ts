import { ApiError } from '../../../services/api-error.ts';

export type MemberActionFailureKind =
  | 'unknown-roles'
  | 'owner-roles-immutable'
  | 'owner-status-immutable'
  | 'owner-removal-immutable'
  | 'already-member'
  | 'invitation-exists'
  | 'invitation-not-found'
  | 'rate-limited'
  | 'network'
  | 'unknown';

/** Maps member/invitation backend errorCodes to a stable UI failure kind. */
export function classifyMemberActionError(error: unknown): MemberActionFailureKind {
  if (error instanceof ApiError && error.code) {
    switch (error.code) {
      case 'UNKNOWN_AGENCY_ROLE_KEYS':
      case 'ROLE_NOT_ASSIGNABLE_IN_AGENCY':
        return 'unknown-roles';
      case 'OWNER_ROLES_IMMUTABLE':
        return 'owner-roles-immutable';
      case 'OWNER_CANNOT_BE_SUSPENDED':
        return 'owner-status-immutable';
      case 'OWNER_CANNOT_BE_REMOVED':
        return 'owner-removal-immutable';
      case 'ALREADY_AGENCY_MEMBER':
        return 'already-member';
      case 'INVITATION_ALREADY_EXISTS':
        return 'invitation-exists';
      case 'INVITATION_NOT_FOUND':
        return 'invitation-not-found';
      case 'RATE_LIMITED':
        return 'rate-limited';
      default:
        return 'unknown';
    }
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}
