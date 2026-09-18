import { ALL_AGENCY_PERMISSION_KEYS, ALL_PLATFORM_PERMISSION_KEYS } from '../rbac/rbac.constants.js';
import { RequireAgencyPermissions } from './require-agency-permissions.decorator.js';

describe('@RequireAgencyPermissions', () => {
  it('accepts keys from the AGENCY catalog', () => {
    expect(() => RequireAgencyPermissions(ALL_AGENCY_PERMISSION_KEYS[0]!)).not.toThrow();
    expect(() =>
      RequireAgencyPermissions(
        ALL_AGENCY_PERMISSION_KEYS[0]!,
        ALL_AGENCY_PERMISSION_KEYS[1]!,
      ),
    ).not.toThrow();
  });

  it('rejects a PLATFORM key, so a route cannot be guarded across scopes', () => {
    expect(() => RequireAgencyPermissions(ALL_PLATFORM_PERMISSION_KEYS[0]!)).toThrow(
      /non-AGENCY permission key/,
    );
  });

  it('rejects a typo rather than guarding with a permission nobody can hold', () => {
    expect(() => RequireAgencyPermissions('AGENCY_BOOKING_VEIW')).toThrow(
      /non-AGENCY permission key/,
    );
  });

  it('rejects an empty declaration', () => {
    expect(() => RequireAgencyPermissions()).toThrow(/at least one permission key/);
  });

  it('names every offending key so the boot failure is actionable', () => {
    expect(() =>
      RequireAgencyPermissions(ALL_AGENCY_PERMISSION_KEYS[0]!, 'NOPE_ONE', 'NOPE_TWO'),
    ).toThrow(/NOPE_ONE, NOPE_TWO/);
  });
});
