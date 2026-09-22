import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export interface TripCapabilities {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canArchive: boolean;
}

/** Which tour actions the current user's permissions allow. */
export function useTripCapabilities(): TripCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can('AGENCY_TOUR_VIEW'),
    canCreate: can('AGENCY_TOUR_CREATE'),
    canUpdate: can('AGENCY_TOUR_UPDATE'),
    canPublish: can('AGENCY_TOUR_PUBLISH'),
    canArchive: can('AGENCY_TOUR_DELETE'),
  };
}
