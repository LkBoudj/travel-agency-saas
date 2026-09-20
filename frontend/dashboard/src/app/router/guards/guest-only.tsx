import { Navigate, Outlet } from "react-router-dom"

import { ROUTES } from "@/app/router/route-paths"
import { useCurrentUser } from "@/features/auth/hooks/use-current-user"
import { FullPageLoader } from "@/components/shared/full-page-loader"

/**
 * Gate for the guest area.
 *
 * An already-signed-in visitor is sent to the agency chooser, which decides
 * where they actually belong based on their memberships.
 */
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser()

  if (isPending) {
    return <FullPageLoader />
  }

  if (user) {
    return <Navigate to={ROUTES.agencies} replace />
  }

  return <Outlet />
}
