import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { AgencyAccessFailureScreen } from '../../../components/agency-failure-screen.tsx';
import { FullPageLoader } from '../../../components/full-page-loader.tsx';
import { AgencyProvider } from '../../../features/agency-context/provider/agency-provider.tsx';
import { useRequireAgency } from '../hooks/use-require-agency.ts';

export function RequireAgency() {
  const { t } = useTranslation('common');
  const { valid, isPending, access, failure, onBack } = useRequireAgency();

  if (!valid) {
    return null;
  }

  if (isPending) {
    return <FullPageLoader label={t('agency.loadingContext')} />;
  }

  if (failure !== null || !access) {
    return <AgencyAccessFailureScreen failure={failure ?? 'unexpected'} onBack={onBack} />;
  }

  return (
    <AgencyProvider code={access.agency.code} access={access}>
      <Outlet />
    </AgencyProvider>
  );
}
