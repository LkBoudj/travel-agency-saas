export type AppEnv = {
  /** Origin of the NestJS API, no trailing slash, no /v1 prefix. */
  apiBaseUrl: string;
  /**
   * Base of the theme registry manifest (`GET <base>/themes.json`), consumed
   * by `features/themes/`. Either an http(s) origin (production) or a
   * root-relative path that the Vite dev server proxies to theme-agency (dev,
   * avoids cross-origin fetches — see `vite.config.ts` `server.proxy`).
   */
  themesBaseUrl: string;
  /** Port `npm run dev` binds (strictPort). */
  devPort: number;
  /** Domain suffix used by the future guest agency-creation flow. */
  platformDomain?: string;
  /**
   * Origin of the public storefront (the Astro app in `frontend/theme-agency`).
   * The dev server is single-tenant — it resolves one agency from its
   * hostname / `LOCALHOST_TENANT_SLUG` — so this origin is the live site of
   * whichever agency it is pointed at. Production has no single origin: there
   * the public URL is built per tenant from `platformDomain` instead.
   */
  storefrontBaseUrl?: string;
  /**
   * The tenant slug the dev storefront currently serves (mirrors
   * theme-agency's `LOCALHOST_TENANT_SLUG`). Dev-only: it lets "View website"
   * say the tab will open a *different* agency's site instead of pretending.
   */
  storefrontTenantSlug?: string;
};

type EnvRecord = Record<string, string | undefined>;

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim().length === 0) {
    return 5175;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid VITE_DEV_PORT "${raw}": expected an integer port between 1 and 65535`);
  }

  return port;
}

function parseApiBaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim().length === 0) {
    throw new Error('Missing VITE_API_BASE_URL (required)');
  }

  const url = raw.trim();
  if (!/^https?:\/\/[^/]+$/.test(url)) {
    throw new Error(
      `Invalid VITE_API_BASE_URL "${raw}": expected an http(s) origin without a path (no trailing slash, no /v1)`
    );
  }

  return url;
}

function parseThemesBaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim().length === 0) {
    return 'http://localhost:4321';
  }

  const url = raw.trim();
  const isOrigin = /^https?:\/\/[^/]+$/.test(url);
  const isRootRelativePath = /^\/(?!\/)/.test(url);
  if (!isOrigin && !isRootRelativePath) {
    throw new Error(
      `Invalid VITE_THEMES_BASE_URL "${raw}": expected an http(s) origin or a root-relative path (e.g. "/themes" for the Vite dev proxy)`
    );
  }

  return url.replace(/\/+$/, '');
}

/**
 * Optional: absent means "no single storefront origin configured", which is the
 * production shape (per-tenant URLs come from `platformDomain`).
 */
function parseStorefrontBaseUrl(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim().length === 0) {
    return undefined;
  }

  const url = raw.trim();
  if (!/^https?:\/\/[^/]+$/.test(url)) {
    throw new Error(
      `Invalid VITE_STOREFRONT_BASE_URL "${raw}": expected an http(s) origin without a path (no trailing slash)`
    );
  }

  return url;
}

/** Pure parser — safe to load and test under `node --test` (no `import.meta.env`). */
export function parseEnv(record: EnvRecord): AppEnv {
  const apiBaseUrl = parseApiBaseUrl(record.VITE_API_BASE_URL);
  const themesBaseUrl = parseThemesBaseUrl(record.VITE_THEMES_BASE_URL);
  const devPort = parsePort(record.VITE_DEV_PORT);
  const platformDomain = record.VITE_PLATFORM_DOMAIN?.trim();
  const storefrontBaseUrl = parseStorefrontBaseUrl(record.VITE_STOREFRONT_BASE_URL);
  const storefrontTenantSlug = record.VITE_STOREFRONT_TENANT_SLUG?.trim();
  const env: AppEnv = {
    apiBaseUrl,
    themesBaseUrl,
    devPort,
    ...(platformDomain && platformDomain.length > 0 ? { platformDomain } : {}),
    ...(storefrontBaseUrl ? { storefrontBaseUrl } : {}),
    ...(storefrontTenantSlug && storefrontTenantSlug.length > 0 ? { storefrontTenantSlug } : {}),
  };

  return Object.freeze(env);
}

/** The frozen app env. Reads `import.meta.env` only here — never elsewhere in src. */
let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cached === undefined) {
    cached = parseEnv(import.meta.env as EnvRecord);
  }
  return cached;
}
