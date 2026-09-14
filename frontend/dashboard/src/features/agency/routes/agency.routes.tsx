import type { RouteObject } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { AgencySettingsPage } from "../pages/agency-settings-page"

/**
 * Agency routes. Mounted inside the dashboard layout by the central router.
 * Milestone A: single settings surface under /agency.
 */
export const agencyRoutes: RouteObject[] = [
  { path: ROUTES.agency, element: <AgencySettingsPage /> },
]