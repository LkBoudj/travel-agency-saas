import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AgencyAccess } from '../types.ts';

export interface AgencyContextValue {
  code: string;
  agency: AgencyAccess['agency'];
  membership: AgencyAccess['membership'];
  roles: AgencyAccess['roles'];
  permissions: ReadonlyArray<string>;
  isOwner: boolean;
  /** True when every given key is included in the member's effective permissions. */
  can: (...keys: string[]) => boolean;
  /** True when the member holds at least one of the given keys. */
  canAny: (...keys: string[]) => boolean;
}

const AgencyContext = createContext<AgencyContextValue | null>(null);

export function AgencyProvider({
  code,
  access,
  children,
}: {
  code: string;
  access: AgencyAccess;
  children: ReactNode;
}) {
  const value = useMemo<AgencyContextValue>(
    () => ({
      code,
      agency: access.agency,
      membership: access.membership,
      roles: access.roles,
      permissions: access.permissions,
      isOwner: access.membership.membershipType === 'OWNER',
      can: (...keys) => keys.every((key) => access.permissions.includes(key)),
      canAny: (...keys) => keys.some((key) => access.permissions.includes(key)),
    }),
    [code, access]
  );

  return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
}

export function useAgencyContext(): AgencyContextValue {
  const value = useContext(AgencyContext);
  if (!value) {
    throw new Error('useAgencyContext must be used within an agency-scoped route');
  }
  return value;
}
