import type { RouteObject } from "react-router-dom"
import { AGENCY_ROUTES } from "@/app/router/route-paths"
import { AgencySettingsPage } from "../pages/agency-settings-page"

/**
 * Agency routes. Mounted inside the dashboard layout by the central router.
 * Milestone A: single settings surface under /agency.
 */
export const agencyRoutes: RouteObject[] = [
  { path: AGENCY_ROUTES.agency, element: <AgencySettingsPage /> },
]