import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export interface PricingCapabilities {
  canView: boolean;
  /** Creating/editing options and replacing departure price sets. */
  canManage: boolean;
}

/** Which pricing actions the current user's permissions allow. */
export function usePricingCapabilities(): PricingCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can('AGENCY_PRICING_VIEW'),
    canManage: can('AGENCY_PRICING_MANAGE'),
  };
}
