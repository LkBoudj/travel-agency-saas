import { ApiError } from "@/lib/api"
import { authErrorMessage } from "./auth-error-messages"

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return authErrorMessage(error.status, error.message)
  }
  return authErrorMessage(undefined)
}
