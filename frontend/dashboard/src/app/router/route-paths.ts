/**
 * Central path definitions for routes referenced outside their owning feature.
 * Feature route modules should also import from here to avoid magic strings.
 */
export const ROUTES = {
  login: "/login",
  register: "/register",
  registerAgency: "/register/agency",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  trips: "/trips",
  tripsNew: "/trips/new",
  tripDetails: "/trips/:tripId",
  bookings: "/bookings",
  bookingDetails: "/bookings/:bookingId",
  customers: "/customers",
  customerDetails: "/customers/:customerId",
  agency: "/agency",
  team: "/team",
  settings: "/settings",
} as const