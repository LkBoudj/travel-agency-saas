/**
 * Explains why an agency context could not be opened.
 *
 * The backend distinguishes these cases deliberately, so the UI can too: "no
 * such agency" and "not your agency" are very different problems for the person
 * reading the screen. Raw error codes never reach them.
 */
export function agencyContextErrorMessage(
  status: number | undefined,
  errorCode?: string,
  serverMessage?: string
): string {
  if (status === 401) {
    return "Your session has expired. Please sign in again."
  }
  if (status === 404 || errorCode === "AGENCY_NOT_FOUND") {
    return "This agency does not exist."
  }
  if (errorCode === "AGENCY_SUSPENDED") {
    return "This agency is suspended and cannot be opened."
  }
  if (errorCode === "AGENCY_MEMBERSHIP_REQUIRED") {
    return "You are not a member of this agency."
  }
  if (errorCode === "AGENCY_MEMBERSHIP_INACTIVE") {
    return "Your access to this agency is suspended."
  }
  if (status === 403) {
    return "You do not have access to this agency."
  }

  const trimmed = serverMessage?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : "We could not load this agency. Please try again."
}
