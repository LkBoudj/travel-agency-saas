import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  setActiveAgencyCode,
  useAgencyAccess,
} from '../../../features/agency-context/hooks/use-agency-context.ts';
import {
  classifyAgencyAccessError,
  type AgencyAccessFailure,
} from '../../../features/agency-context/lib/agency-access.ts';
import { isAgencyCode } from '../../../features/agency-context/lib/agency-paths.ts';
import type { AgencyAccess } from '../../../features/agency-context/types.ts';
import { routePaths } from '../route-paths.ts';
import { useSwitchAgency } from './use-switch-agency.ts';

export interface RequireAgencyState {
  valid: boolean;
  isPending: boolean;
  access: AgencyAccess | undefined;
  failure: AgencyAccessFailure | null;
  onBack: () => void;
}

/**
 * Resolves whether the `:agencyCode` route param is usable and loads the
 * matching access payload, keeping the active-agency marker in sync.
 */
export function useRequireAgency(): RequireAgencyState {
  const { agencyCode } = useParams<{ agencyCode: string }>();
  const navigate = useNavigate();
  const onBack = useSwitchAgency();
  const { data: access, isPending, isError, error } = useAgencyAccess(agencyCode);

  const valid = agencyCode !== undefined && isAgencyCode(agencyCode);

  useEffect(() => {
    if (!valid) {
      navigate(routePaths.modes, { replace: true });
    }
  }, [valid, navigate]);

  useEffect(() => {
    if (valid && access && agencyCode === access.agency.code) {
      setActiveAgencyCode(agencyCode);
    }
  }, [valid, access, agencyCode]);

  const failure: AgencyAccessFailure | null =
    isError || access === undefined ? classifyAgencyAccessError(error) : null;

  return { valid, isPending, access, failure, onBack };
}
