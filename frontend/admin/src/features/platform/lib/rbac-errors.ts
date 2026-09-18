import { ApiError } from "@/lib/api"
import {
  rbacErrorMessage,
  type RbacErrorOperation,
} from "./rbac-error-messages"

export function getRbacErrorMessage(
  operation: RbacErrorOperation,
  error: unknown
): string {
  if (error instanceof ApiError) {
    return rbacErrorMessage(operation, error.status, error.message, error.code)
  }
  return rbacErrorMessage(operation, undefined)
}
