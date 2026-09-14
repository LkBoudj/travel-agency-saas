import type { RouteObject } from "react-router-dom"
import { RequireAuth } from "@/app/router/guards/require-auth"
import { ROUTES } from "@/app/router/route-paths"
import { PlaceholderPage } from "@/components/shared/placeholder-page"
import { agencyRoutes } from "@/features/agency/routes/agency.routes"
import { authRoutes } from "@/features/auth/routes/auth.routes"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"
import { tripRoutes } from "@/features/trips/routes/trips.routes"
import { DashboardLayout } from "@/layouts/dashboard-layout"

/**
 * Placeholder route for a domain not yet built (M0 shell).
 *
 * When a feature grows enough to own its route module (e.g. bookings.routes.tsx),
 * spread its group into DashboardLayout below and delete the placeholder line:
 *
 *   placeholder(ROUTES.bookings, "Bookings"),
 *   ...
 *   ...bookingRoutes,
 */
const placeholder = (path: string, title: string): RouteObject => ({
  path,
  element: <PlaceholderPage title={title} />,
})

const authenticatedRoutes: RouteObject[] = [
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          ...tripRoutes,
          ...agencyRoutes,
          placeholder(ROUTES.bookings, "Bookings"),
          placeholder(ROUTES.customers, "Customers"),
          placeholder(ROUTES.team, "Team"),
          placeholder(ROUTES.settings, "Settings"),
        ],
      },
    ],
  },
]

/** Composes every feature route group into the application route tree. */
export const appRoutes: RouteObject[] = [
  ...authRoutes,
  ...authenticatedRoutes,
]
