import { Outlet } from "react-router-dom"

/**
 * Architectural boundary for the authenticated dashboard area.
 *
 * Real authentication does not exist yet, so the guard currently renders its
 * nested routes unconditionally. Nothing is hardcoded and no auth state is
 * invented here.
 *
 * TODO(auth): once an auth store/hook exists, read the authentication status
 * here and, when the user is unauthenticated, redirect to `ROUTES.login` with
 * `{ state: { from: location } } replace`; otherwise keep rendering <Outlet />.
 */
export function RequireAuth() {
  return <Outlet />
}
