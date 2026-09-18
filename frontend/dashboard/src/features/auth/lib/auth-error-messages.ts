/**
 * Maps a sign-in failure to a message a person can act on.
 *
 * The backend answers a bad email and a bad password with the same generic 401
 * on purpose, so this never tries to be more specific than that: saying which
 * half was wrong would confirm whether an account exists.
 */
export function authErrorMessage(
  status: number | undefined,
  serverMessage?: string
): string {
  if (status === 401) {
    return "Incorrect email or password."
  }
  if (status === 400) {
    return "Check the email and password and try again."
  }
  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  if (status !== undefined && status >= 500) {
    return "We could not reach the server. Please try again."
  }

  const trimmed = serverMessage?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : "Something went wrong. Please try again."
}
