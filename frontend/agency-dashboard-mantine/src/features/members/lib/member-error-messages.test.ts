import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { getMemberErrorMessage } from './member-error-messages.ts';
import { classifyMemberActionError } from './member-errors.ts';

const t = (key: string) => `[${key}]`;

describe('classifyMemberActionError', () => {
  test('classifies member role failures', () => {
    assert.equal(
      classifyMemberActionError(new ApiError('x', 400, 'UNKNOWN_AGENCY_ROLE_KEYS')),
      'unknown-roles'
    );
    assert.equal(
      classifyMemberActionError(new ApiError('x', 400, 'ROLE_NOT_ASSIGNABLE_IN_AGENCY')),
      'unknown-roles'
    );
  });

  test('classifies owner invariants', () => {
    assert.equal(
      classifyMemberActionError(new ApiError('x', 409, 'OWNER_ROLES_IMMUTABLE')),
      'owner-roles-immutable'
    );
    assert.equal(
      classifyMemberActionError(new ApiError('x', 409, 'OWNER_CANNOT_BE_SUSPENDED')),
      'owner-status-immutable'
    );
    assert.equal(
      classifyMemberActionError(new ApiError('x', 409, 'OWNER_CANNOT_BE_REMOVED')),
      'owner-removal-immutable'
    );
  });

  test('classifies invitation conflicts', () => {
    assert.equal(
      classifyMemberActionError(new ApiError('x', 409, 'ALREADY_AGENCY_MEMBER')),
      'already-member'
    );
    assert.equal(
      classifyMemberActionError(new ApiError('x', 409, 'INVITATION_ALREADY_EXISTS')),
      'invitation-exists'
    );
    assert.equal(
      classifyMemberActionError(new ApiError('x', 404, 'INVITATION_NOT_FOUND')),
      'invitation-not-found'
    );
    assert.equal(classifyMemberActionError(new ApiError('x', 429, 'RATE_LIMITED')), 'rate-limited');
  });

  test('falls back to network and unknown kinds', () => {
    assert.equal(classifyMemberActionError(new TypeError('Failed to fetch')), 'network');
    assert.equal(classifyMemberActionError(new ApiError('boom', 500)), 'unknown');
    assert.equal(classifyMemberActionError(undefined), 'unknown');
  });
});

describe('getMemberErrorMessage', () => {
  test('maps kinds to i18n keys', () => {
    assert.equal(
      getMemberErrorMessage(new ApiError('x', 409, 'OWNER_ROLES_IMMUTABLE'), t),
      '[errors.ownerRolesImmutable]'
    );
    assert.equal(getMemberErrorMessage(new TypeError('no'), t), '[errors.network]');
    assert.equal(getMemberErrorMessage(new ApiError('boom', 500), t), '[errors.generic]');
  });
});
