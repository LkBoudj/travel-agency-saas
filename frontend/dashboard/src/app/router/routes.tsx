import { Navigate, type RouteObject } from "react-router-dom"
import { RequireAuth } from "@/app/router/guards/require-auth"
import { AGENCY_ROUTES, LEGACY_ROUTES, ROUTES } from "@/app/router/route-paths"
import { PlaceholderPage } from "@/components/shared/placeholder-page"
import { AgencyContextProvider } from "@/features/agency-context/components/agency-context-provider"
import { AgencySelectionPage } from "@/features/agency-context/pages/agency-selection-page"
import { LegacyRedirectPage } from "@/features/agency-context/pages/legacy-redirect-page"
import { agencyRoutes } from "@/features/agency/routes/agency.routes"
import { authRoutes } from "@/features/auth/routes/auth.routes"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"
import { memberRoutes } from "@/features/members/routes/members.routes"
import { tripRoutes } from "@/features/trips/routes/trips.routes"
import { DashboardLayout } from "@/layouts/dashboard-layout"

/**
 * Placeholder route for a domain not yet built (M0 shell).
 *
 * When a feature grows enough to own its route module (e.g. bookings.routes.tsx),
 * spread its group into DashboardLayout below and delete the placeholder line:
 *
 *   placeholder(AGENCY_ROUTES.bookings, "Bookings"),
 *   ...
 *   ...bookingRoutes,
 */
const placeholder = (path: string, title: string): RouteObject => ({
  path,
  element: <PlaceholderPage title={title} />,
})

/**
 * The authenticated area.
 *
 * Three nested gates, in order: a real session (`RequireAuth`), then the agency
 * named in the URL (`AgencyContextProvider`, which also proves membership and
 * that the agency is operational), then the dashboard shell. Anything below can
 * assume all three hold.
 */
const authenticatedRoutes: RouteObject[] = [
  {
    element: <RequireAuth />,
    children: [
      // Landing route: decides which agency to open, or explains why there is none.
      { path: ROUTES.agencies, element: <AgencySelectionPage /> },

      // Pre-agency-scoped links keep working.
      ...LEGACY_ROUTES.map((path) => ({ path, element: <LegacyRedirectPage /> })),

      {
        path: ROUTES.agencyRoot,
        element: <AgencyContextProvider />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { index: true, element: <Navigate to={AGENCY_ROUTES.dashboard} replace /> },
              { path: AGENCY_ROUTES.dashboard, element: <DashboardPage /> },
              ...tripRoutes,
              ...agencyRoutes,
              placeholder(AGENCY_ROUTES.bookings, "Bookings"),
              placeholder(AGENCY_ROUTES.customers, "Customers"),
              ...memberRoutes,
              placeholder(AGENCY_ROUTES.settings, "Settings"),
            ],
          },
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
