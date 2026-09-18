/**
 * An account as returned by the owner lookup (`GET /v1/app-users/search`).
 *
 * This is deliberately the minimum a picker needs. Unlike `PlatformUser`, it
 * covers EVERY account — including ones with no platform role, which is the
 * normal case for an agency owner — and carries no roles, no timestamps and no
 * database id.
 */
export type AppUserOption = {
  code: string
  firstName: string | null
  lastName: string | null
  email: string
  status: string
}
