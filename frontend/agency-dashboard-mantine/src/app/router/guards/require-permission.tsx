import type { ReactNode } from 'react';
import { AgencyAccessFailureScreen } from '../../../features/agency-context/components/agency-access-failure-screen.tsx';
import { useAgencyContext } from '../../../features/agency-context/provider/agency-provider.tsx';
import { useSwitchAgency } from '../hooks/use-switch-agency.ts';

export function RequirePermission({
  permissions,
  children,
}: {
  permissions: string[];
  children: ReactNode;
}) {
  const { can } = useAgencyContext();
  const onBack = useSwitchAgency();

  if (can(...permissions)) {
    return <>{children}</>;
  }

  return <AgencyAccessFailureScreen failure="permission-denied" onBack={onBack} />;
}
