import type { ReactNode } from 'react';
import { useAgencyContext } from '../features/agency-context/provider/agency-provider.tsx';

export function PermissionGate({
  permissions,
  anyOf,
  fallback = null,
  children,
}: {
  /** Every permission required to render children. */
  permissions?: string[];
  /** At least one of these grants rendering children. Requires `permissions` empty/unset. */
  anyOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny } = useAgencyContext();
  const allowed =
    permissions && permissions.length > 0 ? can(...permissions) : canAny(...(anyOf ?? []));
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function useCan(permissions: string[]): boolean {
  const { can } = useAgencyContext();
  return can(...permissions);
}
