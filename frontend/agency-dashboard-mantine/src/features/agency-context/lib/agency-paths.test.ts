import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  canEnterAgency,
  isAgencyCode,
  normalizeAgencyCode,
  sortEnterableAgencies,
} from './agency-paths.ts';

const enterable = {
  code: 'AGY-AAA111222333CCC',
  name: 'Sahara',
  status: 'ACTIVE' as const,
  membershipType: 'EMPLOYEE' as const,
  membershipStatus: 'ACTIVE' as const,
};
const suspendedAgency = {
  code: 'AGY-BBB111222333CCC',
  name: 'Atlas',
  status: 'SUSPENDED' as const,
  membershipType: 'EMPLOYEE' as const,
  membershipStatus: 'ACTIVE' as const,
};
const suspendedMember = {
  code: 'AGY-CCC111222333CCC',
  name: 'Zanzibar',
  status: 'ACTIVE' as const,
  membershipType: 'OWNER' as const,
  membershipStatus: 'SUSPENDED' as const,
};

describe('isAgencyCode', () => {
  test('accepts AGY- codes', () => {
    assert.equal(isAgencyCode('AGY-1234567890AB'), true);
    assert.equal(isAgencyCode('AGY-3F2A91C7B4D0'), true);
  });
  test('rejects malformed codes', () => {
    assert.equal(isAgencyCode('AGY-123'), false);
    assert.equal(isAgencyCode('CUS-1234567890AB'), false);
    assert.equal(isAgencyCode('AGY-abcdef'), false);
    assert.equal(isAgencyCode(''), false);
  });
});

describe('normalizeAgencyCode', () => {
  test('trims and uppercases', () => {
    assert.equal(normalizeAgencyCode(' agy-3f2a91c7b4d0 '), 'AGY-3F2A91C7B4D0');
  });
});

describe('canEnterAgency', () => {
  test('requires ACTIVE agency and ACTIVE membership', () => {
    assert.equal(canEnterAgency(enterable), true);
    assert.equal(canEnterAgency(suspendedAgency), false);
    assert.equal(canEnterAgency(suspendedMember), false);
  });
});

describe('sortEnterableAgencies', () => {
  test('enterable first, then owner first, then name', () => {
    const sorted = sortEnterableAgencies([suspendedAgency, enterable, suspendedMember]);
    assert.deepEqual(
      sorted.map((a) => a.code),
      [enterable, suspendedMember, suspendedAgency].map((a) => a.code)
    );
  });
});
