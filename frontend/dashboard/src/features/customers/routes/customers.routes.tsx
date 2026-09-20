import type { RouteObject } from "react-router-dom"
import { AGENCY_ROUTES } from "@/app/router/route-paths"
import { CustomerDetailsPage } from "../pages/customer-details-page"
import { CustomersPage } from "../pages/customers-page"

/**
 * Customers routes, mounted inside the agency-scoped dashboard layout, so the
 * agency in the URL is already resolved and proven before these pages render.
 *
 * The details route is keyed by the backend customer `code` (`CUS-...`).
 */
export const customerRoutes: RouteObject[] = [
  { path: AGENCY_ROUTES.customers, element: <CustomersPage /> },
  { path: AGENCY_ROUTES.customerDetails, element: <CustomerDetailsPage /> },
]