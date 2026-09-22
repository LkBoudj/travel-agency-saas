import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { AgencyMember } from '../types.ts';
import { memberDisplayName, memberInitials } from './member-display.ts';

function member(overrides: Partial<AgencyMember>): AgencyMember {
  return {
    code: 'USR-ABC',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@agency.test',
    accountStatus: 'ACTIVE',
    membershipType: 'EMPLOYEE',
    membershipStatus: 'ACTIVE',
    roles: [],
    joinedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('memberDisplayName', () => {
  test('joins first and last name', () => {
    assert.equal(memberDisplayName(member({})), 'Ada Lovelace');
  });

  test('keeps only the known part when one is missing', () => {
    assert.equal(memberDisplayName(member({ lastName: null })), 'Ada');
    assert.equal(memberDisplayName(member({ firstName: '' })), 'Lovelace');
  });

  test('falls back to the email when no name is present', () => {
    assert.equal(memberDisplayName(member({ firstName: null, lastName: null })), 'ada@agency.test');
  });
});

describe('memberInitials', () => {
  test('uses the first and last letters of the name', () => {
    assert.equal(memberInitials(member({})), 'AL');
  });

  test('uses a single initial for single names', () => {
    assert.equal(memberInitials(member({ firstName: 'Cher', lastName: null })), 'C');
  });

  test('falls back to the email prefix', () => {
    const only = member({ firstName: null, lastName: null });
    assert.equal(memberInitials(only), 'A');
  });
});
