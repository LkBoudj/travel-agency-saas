export const ROUTES = {
  login: "/login",
  overview: "/overview",
  users: "/users",
  platformUsers: "/users/platform-users",
  agencies: "/agencies",
  agencyDetails: "/agencies/:code",
  rolesAndPermissions: "/roles-and-permissions",
} as const

/** Builds the details path for one agency, identified by its stable code. */
export function agencyDetailsPath(code: string): string {
  return `/agencies/${encodeURIComponent(code)}`
}