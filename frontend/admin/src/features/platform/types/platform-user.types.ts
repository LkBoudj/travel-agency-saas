/**
 * AppUser account lifecycle statuses. `status` is owned by the backend; the
 * database CHECK constraint `app_user_status_check` restricts it to these
 * values. The client only reads it and sends it back to the status endpoint.
 */
export type PlatformUserStatus = "ACTIVE" | "SUSPENDED"

/**
 * A minimal reference to a Platform Role. `key` is the stable HTTP identifier
 * the client sends back for role assignment; `name` is display-only.
 */
export type PlatformUserRoleRef = {
  key: string
  name: string
}

/**
 * Platform User as returned by the Platform Users API. `code` is the stable
 * technical identifier used in URLs. Database ids and password material are
 * never exposed through this surface.
 */
export type PlatformUser = {
  code: string
  email: string
  firstName: string | null
  lastName: string | null
  status: PlatformUserStatus
  roles: PlatformUserRoleRef[]
  createdAt: string
  updatedAt: string
}