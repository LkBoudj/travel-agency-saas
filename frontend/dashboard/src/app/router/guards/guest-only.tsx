import { Outlet } from "react-router-dom"

/**
 * Architectural boundary for the guest-only area (login, register, ...).
 *
 * Real authentication does not exist yet, so the guard currently renders its
 * nested routes unconditionally. Nothing is hardcoded and no auth state is
 * invented here.
 *
 * TODO(auth): once an auth store/hook exists, read the authentication status
 * here and, when the user is already authenticated, redirect to
 * `ROUTES.dashboard` with `replace`; otherwise keep rendering <Outlet />.
 */
export function GuestOnly() {
  return <Outlet />
}
