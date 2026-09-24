import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export interface DepartureCapabilities {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  /** Opening the per-departure prices dialog (pricing module permission). */
  canManagePrices: boolean;
}

/** Which departure actions the current user's permissions allow. */
export function useDepartureCapabilities(): DepartureCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can('AGENCY_DEPARTURE_VIEW'),
    canCreate: can('AGENCY_DEPARTURE_CREATE'),
    canUpdate: can('AGENCY_DEPARTURE_UPDATE'),
    canCancel: can('AGENCY_DEPARTURE_DELETE'),
    canManagePrices: can('AGENCY_PRICING_MANAGE'),
  };
}
