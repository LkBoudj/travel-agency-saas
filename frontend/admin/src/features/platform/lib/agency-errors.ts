import { ApiError } from "@/lib/api"
import {
  agencyErrorMessage,
  type AgencyErrorOperation,
} from "./agency-error-messages"

export function getAgencyErrorMessage(
  operation: AgencyErrorOperation,
  error: unknown
): string {
  if (error instanceof ApiError) {
    return agencyErrorMessage(operation, error.status, error.message, error.code)
  }
  return agencyErrorMessage(operation, undefined)
}
