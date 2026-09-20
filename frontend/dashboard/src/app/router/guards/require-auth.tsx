import { Navigate, Outlet, useLocation } from "react-router-dom"

import { ROUTES } from "@/app/router/route-paths"
import { useCurrentUser } from "@/features/auth/hooks/use-current-user"
import { FullPageLoader } from "@/components/shared/full-page-loader"

/**
 * Gate for the authenticated area.
 *
 * While the session is still resolving it renders a loader rather than the
 * dashboard, so protected content never flashes before the answer arrives. The
 * attempted location is carried to the login screen so the user can be returned
 * to it after signing in.
 */
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser()
  const location = useLocation()

  if (isPending) {
    return <FullPageLoader />
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  return <Outlet />
}
