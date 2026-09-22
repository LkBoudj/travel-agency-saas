import { Navigate } from 'react-router-dom';
import { FullPageLoader } from '../../../components/full-page-loader.tsx';
import { useRootRedirectTarget } from '../hooks/use-root-redirect-target.ts';

export function RootRedirect() {
  const { isLoading, to } = useRootRedirectTarget();

  if (isLoading || to === null) {
    return <FullPageLoader />;
  }

  return <Navigate to={to} replace />;
}
