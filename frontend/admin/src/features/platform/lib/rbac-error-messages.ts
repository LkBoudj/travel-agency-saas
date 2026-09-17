export type RbacErrorOperation =
  | "create-role"
  | "update-role"
  | "delete-role"
  | "replace-permissions"

const FALLBACK_MESSAGE = "Something went wrong. Please try again."

/**
 * Maps an RBAC request failure to a user-facing message. Status codes are
 * handled explicitly so permission-denied and conflict responses never leak
 * raw backend error codes into the UI.
 */
export function rbacErrorMessage(
  operation: RbacErrorOperation,
  status: number | undefined,
  serverMessage?: string
): string {
  const trimmed = serverMessage?.trim() ?? ""

  if (status === 401) {
    return "Your session has expired. Please sign in again."
  }

  if (status === 403) {
    return "You do not have permission to perform this action."
  }

  if (status === 404) {
    return "This role no longer exists. Refresh the page and try again."
  }

  if (status === 409) {
    if (operation === "delete-role") {
      return "This role is assigned to one or more platform users and cannot be deleted."
    }
    return "A role with this name already exists."
  }

  if (status === 400 && operation === "replace-permissions") {
    return (
      trimmed ||
      "One or more selected permissions are not available for platform roles."
    )
  }

  return trimmed || FALLBACK_MESSAGE
}
