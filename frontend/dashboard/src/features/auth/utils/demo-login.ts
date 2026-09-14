/**
 * Development-only demo authentication.
 *
 * Lets us reach `/dashboard` while the real backend does not exist.
 * In production builds Vite statically replaces `import.meta.env.DEV` with
 * `false`, so this shortcut is dead code there and can never authenticate.
 *
 * Remove this file together with its usage in `use-login.ts` once the real
 * authentication backend is wired.
 */
export const DEMO_LOGIN_EMAIL = "demo@travel-saas.test"

export function isDemoLogin(email: string, password: string): boolean {
  if (!import.meta.env.DEV) return false
  return email.trim().toLowerCase() === DEMO_LOGIN_EMAIL && password.length > 0
}
