import { classifyMemberActionError, type MemberActionFailureKind } from './member-errors.ts';

type Translate = (key: string) => string;

const MEMBER_ERROR_KEYS: Record<MemberActionFailureKind, string> = {
  'unknown-roles': 'errors.unknownRoles',
  'owner-roles-immutable': 'errors.ownerRolesImmutable',
  'owner-status-immutable': 'errors.ownerStatusImmutable',
  'owner-removal-immutable': 'errors.ownerRemovalImmutable',
  'already-member': 'errors.alreadyMember',
  'invitation-exists': 'errors.invitationExists',
  'invitation-not-found': 'errors.invitationNotFound',
  'rate-limited': 'errors.rateLimited',
  network: 'errors.network',
  unknown: 'errors.generic',
};

export function getMemberErrorMessage(error: unknown, t: Translate): string {
  return t(MEMBER_ERROR_KEYS[classifyMemberActionError(error)]);
}
