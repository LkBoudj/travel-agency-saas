/** The signed-in account, as `GET /v1/auth/me` returns it. */
export type AuthUser = {
  code: string
  email: string
  firstName: string | null
  lastName: string | null
}
