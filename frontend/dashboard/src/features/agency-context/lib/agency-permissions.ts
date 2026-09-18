/**
 * Whether the current context grants every one of the required permissions.
 *
 * This is UX only: it decides whether a control is worth showing, never whether
 * an operation is allowed. Every agency route is enforced server-side, and a
 * request that slips through anyway comes back 403.
 *
 * Requiring ALL of the keys (rather than any) matches how the backend guard
 * evaluates `@RequireAgencyPermissions`, so a control is shown exactly when the
 * call behind it would be accepted.
 */
export function hasAgencyPermissions(
  granted: readonly string[],
  required: readonly string[]
): boolean {
  if (required.length === 0) return true
  const set = new Set(granted)
  return required.every((key) => set.has(key))
}
