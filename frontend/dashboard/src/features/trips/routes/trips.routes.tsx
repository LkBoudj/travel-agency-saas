import type { RouteObject } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { TripEditorPage } from "../pages/trip-editor-page"
import { TripsPage } from "../pages/trips-page"

/**
 * Trips routes. Mounted inside the dashboard layout by the central router.
 *
 * Creation happens in the Create Trip drawer on the list (v4); there is no
 * `/trips/new` route. `/trips/:tripId` hosts the full trip editor.
 */
export const tripRoutes: RouteObject[] = [
  { path: ROUTES.trips, element: <TripsPage /> },
  { path: ROUTES.tripDetails, element: <TripEditorPage /> },
]