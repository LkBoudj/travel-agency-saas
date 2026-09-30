import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export interface WebsiteCapabilities {
  canView: boolean;
  canEditContent: boolean;
  canEditTheme: boolean;
  canPublish: boolean;
}

export function useWebsiteCapabilities(): WebsiteCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can('AGENCY_WEBSITE_VIEW'),
    canEditContent: can('AGENCY_WEBSITE_CONTENT_EDIT'),
    canEditTheme: can('AGENCY_WEBSITE_THEME_UPDATE'),
    canPublish: can('AGENCY_WEBSITE_PUBLISH'),
  };
}
