export type PlatformUserErrorOperation =
  | "create-user"
  | "update-user"
  | "set-status"
  | "replace-roles"

const FALLBACK_MESSAGE = "Something went wrong. Please try again."

/**
 * Maps a Platform Users request failure to a user-facing message. Status codes
 * and machine codes are handled explicitly so permission-denied, conflict and
 * role-selection responses never leak raw backend error codes into the UI.
 */
export function platformUserErrorMessage(
  operation: PlatformUserErrorOperation,
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
    return "This user no longer exists. Refresh the page and try again."
  }

  if (status === 409 && errorCode === "EMAIL_ALREADY_REGISTERED") {
    return "A user with this email address already exists."
  }

  if (status === 400) {
    if (operation === "create-user" || operation === "replace-roles") {
      if (errorCode === "AGENCY_ROLE_NOT_ASSIGNABLE") {
        return "One or more selected roles are not platform roles and cannot be assigned here."
      }
      if (errorCode === "UNKNOWN_PLATFORM_ROLE_KEYS") {
        return "One or more selected roles no longer exist. Refresh the page and try again."
      }
    }
    if (operation === "set-status" && errorCode === "CANNOT_SUSPEND_OWN_ACCOUNT") {
      return "You cannot suspend your own account."
    }
    if (errorCode === "ROLE_KEYS_REQUIRED") {
      return "Select at least one role."
    }
  }

  return trimmed || FALLBACK_MESSAGE
}