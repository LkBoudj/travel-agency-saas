import type { RouteObject } from "react-router-dom"
import { AGENCY_ROUTES } from "@/app/router/route-paths"
import { BookingDetailsPage } from "../pages/booking-details-page"
import { BookingsPage } from "../pages/bookings-page"

/**
 * Bookings routes, mounted inside the agency-scoped dashboard layout, so the
 * agency in the URL is already resolved and proven before these pages render.
 *
 * The details route is keyed by the backend booking `code` (`BKG-...`).
 */
export const bookingRoutes: RouteObject[] = [
  { path: AGENCY_ROUTES.bookings, element: <BookingsPage /> },
  { path: AGENCY_ROUTES.bookingDetails, element: <BookingDetailsPage /> },
]