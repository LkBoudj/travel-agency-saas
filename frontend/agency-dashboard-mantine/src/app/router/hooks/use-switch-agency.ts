import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearActiveAgencyCode } from '../../../features/agency-context/hooks/use-agency-context.ts';
import { routePaths } from '../route-paths.ts';

/** Clears the active agency and returns to the agency chooser. */
export function useSwitchAgency(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    clearActiveAgencyCode();
    navigate(routePaths.modes);
  }, [navigate]);
}
