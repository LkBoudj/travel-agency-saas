import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildInvitationPayload,
  buildInvitationStatusQuery,
  buildMemberSearchQuery,
  buildMemberStatusPayload,
  buildRolesPayload,
} from './member-payloads.ts';

describe('buildRolesPayload', () => {
  test('wraps keys and dedupes them', () => {
    assert.deepEqual(buildRolesPayload(['A', 'B', 'A']), { roleKeys: ['A', 'B'] });
  });
});

describe('buildMemberStatusPayload', () => {
  test('reflects the requested status verbatim', () => {
    assert.deepEqual(buildMemberStatusPayload('SUSPENDED'), { status: 'SUSPENDED' });
    assert.deepEqual(buildMemberStatusPayload('ACTIVE'), { status: 'ACTIVE' });
  });
});

describe('buildInvitationPayload', () => {
  test('trims, lowercases the email and dedupes roles', () => {
    assert.deepEqual(buildInvitationPayload('  ADA@AGENCY.TEST ', ['A', 'A']), {
      email: 'ada@agency.test',
      roleKeys: ['A'],
    });
  });
});

describe('buildMemberSearchQuery', () => {
  test('omits the query for blank searches', () => {
    assert.equal(buildMemberSearchQuery(''), '');
    assert.equal(buildMemberSearchQuery('   '), '');
  });

  test('encodes the trimmed search', () => {
    assert.equal(buildMemberSearchQuery(' ada '), '?search=ada');
    assert.equal(buildMemberSearchQuery('a b'), '?search=a%20b');
  });
});

describe('buildInvitationStatusQuery', () => {
  test('omits the query for an undefined filter', () => {
    assert.equal(buildInvitationStatusQuery(), '');
  });

  test('encodes an explicit status filter', () => {
    assert.equal(buildInvitationStatusQuery('PENDING'), '?status=PENDING');
  });
});
