export type AuthUser = {
  code: string
  email: string
  firstName: string | null
  lastName: string | null
}

export type LoginCredentials = {
  email: string
  password: string
}