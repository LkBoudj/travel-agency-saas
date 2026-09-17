import { Navigate, Outlet, useLocation } from "react-router-dom"

import { AuthPending } from "@/components/auth-pending"
import { useCurrentUser } from "@/features/auth/hooks/use-current-user"
import { ROUTES } from "../route-paths"

export function RequireAuth() {
  const location = useLocation()
  const { data, isPending, isError } = useCurrentUser()

  if (isPending) {
    return <AuthPending />
  }

  if (isError || !data) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }

  return <Outlet context={{ user: data }} />
}