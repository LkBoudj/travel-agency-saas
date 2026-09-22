import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../../../components/full-page-loader.tsx';
import { useCurrentUser } from '../../../features/auth/hooks/use-auth.ts';

export function RequireAuth() {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
