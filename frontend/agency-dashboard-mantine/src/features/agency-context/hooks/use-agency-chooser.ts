import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { useLogout } from '../../auth/hooks/use-auth.ts';
import { canEnterAgency, sortEnterableAgencies } from '../lib/agency-paths.ts';
import { setActiveAgencyCode, useMyAgencies } from './use-agency-context.ts';

export function useAgencyChooser() {
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: agencies, isPending } = useMyAgencies();

  const sortedAgencies = useMemo(() => sortEnterableAgencies(agencies ?? []), [agencies]);
  const enterable = useMemo(() => (agencies ?? []).filter(canEnterAgency), [agencies]);
  const autoEntered = enterable.length === 1;

  useEffect(() => {
    if (autoEntered) {
      setActiveAgencyCode(enterable[0].code);
      navigate(dashboardPaths.overview(enterable[0].code), { replace: true });
    }
  }, [autoEntered, enterable, navigate]);

  const enterAgency = useCallback(
    (agencyCode: string) => {
      setActiveAgencyCode(agencyCode);
      navigate(dashboardPaths.overview(agencyCode));
    },
    [navigate]
  );

  const signOut = useCallback(() => {
    logout.mutate();
  }, [logout]);

  return { isPending, sortedAgencies, autoEntered, enterAgency, signOut };
}
