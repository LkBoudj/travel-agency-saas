import { Navigate, Outlet } from "react-router-dom"

import { AuthPending } from "@/components/auth-pending"
import { useCurrentUser } from "@/features/auth/hooks/use-current-user"
import { DEFAULT_AUTHENTICATED_PATH } from "@/features/auth/hooks/use-login"

export function GuestOnly() {
  const { data, isError, isPending } = useCurrentUser()

  if (isPending) {
    return <AuthPending />
  }

  if (!isError && data) {
    return <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace />
  }

  return <Outlet />
}