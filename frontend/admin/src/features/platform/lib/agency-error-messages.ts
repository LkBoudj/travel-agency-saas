export type AgencyErrorOperation =
  | "create-agency"
  | "update-agency"
  | "set-agency-status"
  | "load-agency"

const FALLBACK_MESSAGE = "Something went wrong. Please try again."

/**
 * Maps an Agency request failure to a user-facing message.
 *
 * Status codes and machine codes are handled explicitly so permission-denied,
 * not-found and ownership conflicts never surface raw backend error codes or
 * stack traces. Anything unrecognized falls back to the backend's own message,
 * which the API layer already reduces to `{ message, errorCode }`.
 */
export function agencyErrorMessage(
  operation: AgencyErrorOperation,
  status: number | undefined,
  serverMessage?: string,
  errorCode?: string
): string {
  const trimmed = serverMessage?.trim() ?? ""

  if (status === 401) {
    return "Your session has expired. Please sign in again."
  }

  if (status === 403) {
    return "You do not have permission to perform this action."
  }

  if (status === 404) {
    if (errorCode === "OWNER_APP_USER_NOT_FOUND") {
      return "No account matches that owner code. Check the code and try again."
    }
    if (operation === "create-agency") {
      return "The owner account could not be found."
    }
    return "This agency no longer exists. Refresh the page and try again."
  }

  if (status === 409) {
    if (errorCode === "EMAIL_ALREADY_REGISTERED") {
      return "An account with this email already exists. Switch to “Existing user” and select it instead."
    }
    if (errorCode === "USER_CREATE_CONFLICT") {
      return "That account could not be created. Check the email address and try again."
    }
    if (errorCode === "OWNER_APP_USER_NOT_ACTIVE") {
      return "That account is suspended and cannot own an agency."
    }
    if (
      errorCode === "AGENCY_ADMIN_ROLE_INVALID" ||
      errorCode === "AGENCY_ADMIN_ROLE_MISSING"
    ) {
      return "The platform role catalog is not ready for agency creation. Contact a platform administrator."
    }
    return trimmed || FALLBACK_MESSAGE
  }

  if (status === 400) {
    if (errorCode === "AGENCY_ADMIN_ROLE_MISSING") {
      return "The platform role catalog is not ready for agency creation. Contact a platform administrator."
    }
    return trimmed || "Some of the submitted values are not valid."
  }

  return trimmed || FALLBACK_MESSAGE
}
