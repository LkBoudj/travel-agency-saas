import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgencyContext } from '../../../features/agency-context/provider/agency-provider.tsx';
import { useLogout } from '../../../features/auth/hooks/use-auth.ts';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { setLocale } from '../../../i18n/index.ts';
import type { AppLocale } from '../../../i18n/locales.ts';
import { useSwitchAgency } from '../../router/hooks/use-switch-agency.ts';
import { routePaths } from '../../router/route-paths.ts';

export interface SidebarFooterController {
  agencyName: string;
  agencyCode: string;
  membershipLabel: string;
  roles: ReadonlyArray<{ key: string; name: string }>;
  locale: AppLocale;
  handleSetLocale: (locale: AppLocale) => void;
  handleSignOut: () => void;
  handleSwitchAgency: () => void;
}

export function useSidebarFooter(): SidebarFooterController {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const logout = useLogout();
  const { agency, membership, roles } = useAgencyContext();
  const locale = useAppLocale();
  const handleSwitchAgency = useSwitchAgency();

  const handleSignOut = () => {
    logout.mutate(undefined, { onSuccess: () => navigate(routePaths.login, { replace: true }) });
  };

  const membershipLabel =
    membership.membershipType === 'OWNER' ? t('shell.owner') : t('shell.employee');

  return {
    agencyName: agency.name,
    agencyCode: agency.code,
    membershipLabel,
    roles,
    locale,
    handleSetLocale: setLocale,
    handleSignOut,
    handleSwitchAgency,
  };
}
