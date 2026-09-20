import { ApiError } from "@/lib/api"
import { agencyContextErrorMessage } from "./agency-context-errors"

/**
 * Adapts an `ApiError` onto the pure message mapper.
 *
 * The mapper itself deliberately imports nothing, so it can be unit-tested with
 * `node --test`, which does not resolve this project's `@/` path alias.
 */
export function getAgencyContextErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return agencyContextErrorMessage(error.status, error.code, error.message)
  }
  return agencyContextErrorMessage(undefined)
}
