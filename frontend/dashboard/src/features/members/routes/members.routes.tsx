import type { RouteObject } from "react-router-dom"
import { AGENCY_ROUTES } from "@/app/router/route-paths"
import { MembersPage } from "../pages/members-page"

/**
 * Members routes, mounted inside the agency-scoped dashboard layout, so the
 * agency in the URL is already resolved and proven before this page renders.
 */
export const memberRoutes: RouteObject[] = [
  { path: AGENCY_ROUTES.team, element: <MembersPage /> },
]
