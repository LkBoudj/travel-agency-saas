import {
  setActiveAgencyCode,
  useActiveAgencyCode,
  useMyAgencies,
} from '../../../features/agency-context/hooks/use-agency-context.ts';
import { canEnterAgency, isAgencyCode } from '../../../features/agency-context/lib/agency-paths.ts';
import { dashboardPaths, routePaths } from '../route-paths.ts';

/** Decides where the root route should land once the agency list is known. */
export function useRootRedirectTarget(): { isLoading: boolean; to: string | null } {
  const activeCode = useActiveAgencyCode();
  const { data: agencies, isLoading } = useMyAgencies();

  if (isLoading) {
    return { isLoading: true, to: null };
  }

  const enterable = (agencies ?? []).filter(canEnterAgency);

  if (
    activeCode &&
    isAgencyCode(activeCode) &&
    enterable.some((agency) => agency.code === activeCode)
  ) {
    return { isLoading: false, to: dashboardPaths.overview(activeCode) };
  }

  if (enterable.length === 1) {
    setActiveAgencyCode(enterable[0].code);
    return { isLoading: false, to: dashboardPaths.overview(enterable[0].code) };
  }

  return { isLoading: false, to: routePaths.modes };
}
