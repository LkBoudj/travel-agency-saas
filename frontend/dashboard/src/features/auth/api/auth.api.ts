import { apiRequest } from "@/lib/api"
import type { AuthUser } from "../types/auth.types"

export const AUTH_QUERY_KEY = ["auth", "me"] as const

export type LoginInput = {
  email: string
  password: string
}

/**
 * Signs in. The backend replies with an HttpOnly cookie; nothing about the
 * session is returned to or stored by client code.
 */
export function login(input: LoginInput): Promise<AuthUser> {
  return apiRequest<AuthUser>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function logout(): Promise<void> {
  return apiRequest<void>("/v1/auth/logout", { method: "POST" })
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/v1/auth/me")
}
