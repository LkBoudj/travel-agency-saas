import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export interface CustomerCapabilities {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
}

/** Which customer actions the current user's permissions allow. */
export function useCustomerCapabilities(): CustomerCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can('AGENCY_CUSTOMER_VIEW'),
    canCreate: can('AGENCY_CUSTOMER_CREATE'),
    canUpdate: can('AGENCY_CUSTOMER_UPDATE'),
    canArchive: can('AGENCY_CUSTOMER_ARCHIVE'),
  };
}
