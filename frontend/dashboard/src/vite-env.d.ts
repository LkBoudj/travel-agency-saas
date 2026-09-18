/// <reference types="vite/client" />

/**
 * Every environment variable this app reads, declared once.
 *
 * Adding one here and to `.env.example` is what makes it a real setting rather
 * than a string buried in a module. Only VITE_-prefixed variables are exposed
 * to the browser, and everything here ships inside the bundle — no secrets.
 */
interface ImportMetaEnv {
  /** Backend origin, no trailing slash. Request paths carry the /v1 prefix. */
  readonly VITE_API_BASE_URL?: string
  /** Dev server port; must be an origin the backend's CORS allowlist accepts. */
  readonly VITE_DEV_PORT?: string
  /** Domain suffix suggested in the agency creation form. */
  readonly VITE_PLATFORM_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
