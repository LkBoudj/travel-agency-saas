import { apiRequest } from "@/lib/api"
import type { AuthUser, LoginCredentials } from "../types/auth.types"

export const AUTH_QUERY_KEY = ["auth", "me"] as const

export function login(credentials: LoginCredentials): Promise<AuthUser> {
  return apiRequest<AuthUser>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  })
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/v1/auth/me")
}

export function logout(): Promise<void> {
  return apiRequest<void>("/v1/auth/logout", { method: "POST" })
}