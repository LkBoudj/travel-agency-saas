/**
 * Central path definitions for routes referenced outside their owning feature.
 * Feature route modules should also import from here to avoid magic strings.
 *
 * The authenticated area is agency-scoped: every one of its routes lives under
 * `/agencies/:agencyCode/...`, so the URL alone says which agency a screen is
 * operating on. Nothing stores a "current agency", which is what lets two
 * browser tabs sit in two different agencies at the same time.
 */
export const ROUTES = {
  login: "/login",
  register: "/register",
  registerAgency: "/register/agency",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  /** Landing route after sign-in: decides which agency to open. */
  agencies: "/agencies",
  /** Parent of every agency-scoped route. */
  agencyRoot: "/agencies/:agencyCode",
} as const

/**
 * Child paths mounted under `/agencies/:agencyCode`. Relative on purpose, so
 * the agency segment is declared once by the parent route.
 */
export const AGENCY_ROUTES = {
  dashboard: "dashboard",
  trips: "trips",
  tripDetails: "trips/:tourCode",
  bookings: "bookings",
  bookingDetails: "bookings/:bookingCode",
  customers: "customers",
  customerDetails: "customers/:customerCode",
  agency: "agency",
  team: "team",
  settings: "settings",
} as const

/**
 * The flat paths this app used before routes became agency-scoped.
 *
 * They are kept only so existing links and bookmarks still work: each one
 * redirects into the same section of whichever agency the user resolves to.
 */
export const LEGACY_ROUTES = [
  "/dashboard",
  "/trips",
  "/bookings",
  "/customers",
  "/agency",
  "/team",
  "/settings",
] as const
