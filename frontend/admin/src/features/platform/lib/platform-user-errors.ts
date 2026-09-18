import { ApiError } from "@/lib/api"
import {
  platformUserErrorMessage,
  type PlatformUserErrorOperation,
} from "./platform-user-error-messages"

export function getPlatformUserErrorMessage(
  operation: PlatformUserErrorOperation,
  error: unknown
): string {
  if (error instanceof ApiError) {
    return platformUserErrorMessage(
      operation,
      error.status,
      error.message,
      error.code
    )
  }
  return platformUserErrorMessage(operation, undefined)
}