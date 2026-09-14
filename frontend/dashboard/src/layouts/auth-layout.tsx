import { Outlet } from "react-router-dom"

/**
 * Thin shell for the guest area (login, register, password flows).
 * Renders a centered container and lets nested routes fill it via <Outlet />.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_8%,transparent)_0%,transparent_60%)] p-4 sm:p-6">
      <Outlet />
    </div>
  )
}
