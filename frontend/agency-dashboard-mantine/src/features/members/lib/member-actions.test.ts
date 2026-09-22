import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { AgencyMember } from '../types.ts';
import {
  canManageMemberRoles,
  canRemoveMember,
  canToggleMemberStatus,
  isOwnerMember,
  memberHasRole,
  nextMembershipStatus,
} from './member-actions.ts';

const owner: AgencyMember = {
  code: 'USR-OWNER00000000000000000',
  firstName: 'Nadia',
  lastName: 'Owner',
  email: 'owner@agency.test',
  accountStatus: 'ACTIVE',
  membershipType: 'OWNER',
  membershipStatus: 'ACTIVE',
  roles: [],
  joinedAt: '2026-01-01T00:00:00Z',
};

const employee: AgencyMember = {
  ...owner,
  code: 'USR-EMP000000000000000000',
  firstName: null,
  lastName: null,
  email: 'employee@agency.test',
  membershipType: 'EMPLOYEE',
  roles: [{ key: 'AGENCY_TRIP_MANAGER', name: 'Trip manager' }],
};

describe('owner invariants', () => {
  test('isOwnerMember distinguishes membership types', () => {
    assert.equal(isOwnerMember(owner), true);
    assert.equal(isOwnerMember(employee), false);
  });

  test('owner rows are locked against roles/status/remove mutations', () => {
    assert.equal(canManageMemberRoles(owner), false);
    assert.equal(canToggleMemberStatus(owner), false);
    assert.equal(canRemoveMember(owner), false);
  });

  test('employees can be managed', () => {
    assert.equal(canManageMemberRoles(employee), true);
    assert.equal(canToggleMemberStatus(employee), true);
    assert.equal(canRemoveMember(employee), true);
  });
});

describe('nextMembershipStatus', () => {
  test('toggles between ACTIVE and SUSPENDED', () => {
    assert.equal(nextMembershipStatus('ACTIVE'), 'SUSPENDED');
    assert.equal(nextMembershipStatus('SUSPENDED'), 'ACTIVE');
  });
});

describe('memberHasRole', () => {
  test('checks the member role set by key', () => {
    assert.equal(memberHasRole(employee, 'AGENCY_TRIP_MANAGER'), true);
    assert.equal(memberHasRole(employee, 'AGENCY_CUSTOMER_MANAGER'), false);
    assert.equal(memberHasRole(owner, 'AGENCY_TRIP_MANAGER'), false);
  });
});
