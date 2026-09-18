import { describe, expect, it } from 'vitest';
import {
  AGENCY_OWNER_ROLE_KEY,
  ALL_AGENCY_PERMISSION_KEYS,
  ALL_PLATFORM_PERMISSION_KEYS,
  DEFAULT_GLOBAL_AGENCY_ROLES,
  DEFAULT_PLATFORM_ROLES,
  PLATFORM_ADMIN_ROLE_KEY,
  RBAC_PERMISSION_CATALOG,
  validateRbacCatalog,
} from './rbac.constants.js';
import { PERMISSION_ACTIONS, PERMISSION_RESOURCES, ROLE_SCOPES } from './rbac.types.js';

const EXPECTED_PLATFORM_PERMISSION_COUNT = 31;
const EXPECTED_AGENCY_PERMISSION_COUNT = 38;

const ROLE_PERMISSION_COUNTS: Record<string, number> = {
  PLATFORM_ADMIN: 31,
  PLATFORM_IDENTITY_ADMIN: 16,
  PLATFORM_AGENCY_ADMIN: 17,
  PLATFORM_CATALOG_MANAGER: 7,
  PLATFORM_SUPPORT_AGENT: 9,
  AGENCY_OWNER: 38,
  AGENCY_MANAGER: 37,
  AGENCY_BOOKING_AGENT: 15,
  AGENCY_TOUR_MANAGER: 16,
  AGENCY_ACCOUNTANT: 7,
  AGENCY_VIEWER: 11,
};

const catalogByKey = new Map(RBAC_PERMISSION_CATALOG.map((entry) => [entry.key, entry]));
const allPresets = [...DEFAULT_PLATFORM_ROLES, ...DEFAULT_GLOBAL_AGENCY_ROLES];

describe('RBAC permission catalog', () => {
  it('passes programmatic validation', () => {
    expect(() => validateRbacCatalog()).not.toThrow();
  });

  it('contains the expected number of PLATFORM and AGENCY permissions', () => {
    expect(ALL_PLATFORM_PERMISSION_KEYS).toHaveLength(EXPECTED_PLATFORM_PERMISSION_COUNT);
    expect(ALL_AGENCY_PERMISSION_KEYS).toHaveLength(EXPECTED_AGENCY_PERMISSION_COUNT);
    expect(RBAC_PERMISSION_CATALOG).toHaveLength(
      EXPECTED_PLATFORM_PERMISSION_COUNT + EXPECTED_AGENCY_PERMISSION_COUNT,
    );
  });

  it('has unique keys, all shaped as <SCOPE>_<RESOURCE>_<ACTION>', () => {
    const keys = RBAC_PERMISSION_CATALOG.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of RBAC_PERMISSION_CATALOG) {
      expect(entry.key).toBe(`${entry.scope}_${entry.resource}_${entry.action}`);
    }
  });

  it('only uses known scopes, resources and actions', () => {
    for (const entry of RBAC_PERMISSION_CATALOG) {
      expect(ROLE_SCOPES).toContain(entry.scope);
      expect(PERMISSION_RESOURCES).toContain(entry.resource);
      expect(PERMISSION_ACTIONS).toContain(entry.action);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('derives the ALL_* key lists from the catalog', () => {
    expect(ALL_PLATFORM_PERMISSION_KEYS).toEqual(
      RBAC_PERMISSION_CATALOG.filter((entry) => entry.scope === 'PLATFORM').map(
        (entry) => entry.key,
      ),
    );
    expect(ALL_AGENCY_PERMISSION_KEYS).toEqual(
      RBAC_PERMISSION_CATALOG.filter((entry) => entry.scope === 'AGENCY').map((entry) => entry.key),
    );
  });
});

describe('RBAC default role presets', () => {
  it('defines unique role keys', () => {
    const keys = allPresets.map((role) => role.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps each role inside its own scope and prefix', () => {
    for (const role of allPresets) {
      expect(ROLE_SCOPES).toContain(role.scope);
      expect(role.key.startsWith(`${role.scope}_`)).toBe(true);
      expect(role.name.length).toBeGreaterThan(0);
      expect(role.description.length).toBeGreaterThan(0);
    }
  });

  it('only references existing permissions from the same scope, without duplicates', () => {
    for (const role of allPresets) {
      expect(new Set(role.permissionKeys).size).toBe(role.permissionKeys.length);
      for (const permissionKey of role.permissionKeys) {
        const permission = catalogByKey.get(permissionKey);
        expect(permission, `${role.key} -> ${permissionKey}`).toBeDefined();
        expect(permission?.scope).toBe(role.scope);
      }
    }
  });

  it('gives PLATFORM_ADMIN every PLATFORM permission', () => {
    const role = DEFAULT_PLATFORM_ROLES.find((preset) => preset.key === PLATFORM_ADMIN_ROLE_KEY);
    expect(role).toBeDefined();
    expect(new Set(role!.permissionKeys)).toEqual(new Set(ALL_PLATFORM_PERMISSION_KEYS));
  });

  it('gives AGENCY_OWNER every AGENCY permission', () => {
    const role = DEFAULT_GLOBAL_AGENCY_ROLES.find(
      (preset) => preset.key === AGENCY_OWNER_ROLE_KEY,
    );
    expect(role).toBeDefined();
    expect(new Set(role!.permissionKeys)).toEqual(new Set(ALL_AGENCY_PERMISSION_KEYS));
  });

  it('gives AGENCY_MANAGER every AGENCY permission except deleting roles', () => {
    const role = DEFAULT_GLOBAL_AGENCY_ROLES.find((preset) => preset.key === 'AGENCY_MANAGER');
    expect(role).toBeDefined();
    expect(new Set(role!.permissionKeys)).toEqual(
      new Set(ALL_AGENCY_PERMISSION_KEYS.filter((key) => key !== 'AGENCY_ROLE_DELETE')),
    );
  });

  it('matches the expected permission count per default role', () => {
    for (const role of allPresets) {
      expect(role.permissionKeys, role.key).toHaveLength(ROLE_PERMISSION_COUNTS[role.key]);
    }
  });
});
