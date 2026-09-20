import { ApiError } from "@/lib/api"
import { memberErrorMessage } from "./member-error-messages"

/** Turns a thrown error into a sentence for the UI. */
export function getMemberErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return memberErrorMessage(error.status, error.code, error.message)
  }
  if (error instanceof Error && error.message) {
    // Network/abort failures never reached the backend, so there is no code.
    return "We could not reach the server. Check your connection and try again."
  }
  return "Something went wrong. Please try again."
}

/** Whether this failure means the session ended. */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
