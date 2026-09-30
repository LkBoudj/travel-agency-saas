/**
 * Public website address resolution — pure, no env or network access.
 *
 * Precedence (first match wins):
 *  1. `customDomain` — the shape the future Domain feature will provide. It
 *     wins over everything, so an agency with its own domain never gets a
 *     platform URL.
 *  2. `storefrontBaseUrl` — the dev/single-tenant storefront. The dev Astro
 *     server resolves one agency from its hostname, so its origin *is* the
 *     live site of the agency it points at.
 *  3. `slug` + `platformDomain` — the production tenant form.
 *
 * Anything it cannot resolve honestly returns `null`: the caller then offers a
 * preview instead of opening a URL that would 404 or point at someone else's
 * site. Nothing here invents a domain.
 */

/** Mirrors the backend's `AgencyWebsite.slug` / the storefront tenant pattern. */
const tenantSlugPattern = /^(?!.*--)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** A DNS host: no scheme, no path, no port, no `--`, no leading/trailing dot. */
const hostPattern = /^(?!.*--)[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;

export interface WebsiteUrlInput {
  /** `AgencyWebsite.slug`; absent before the website row exists. */
  slug: string | null | undefined;
  /** Production tenant suffix, e.g. `example.com`. */
  platformDomain?: string | undefined;
  /** Single-tenant storefront origin (dev). */
  storefrontBaseUrl?: string | undefined;
  /** Agency-owned domain, when one exists. */
  customDomain?: string | null | undefined;
}

/** The live public URL of the agency website, or `null` when unresolvable. */
export function websitePublicUrl(input: WebsiteUrlInput): string | null {
  const customDomain = input.customDomain?.trim().toLowerCase() ?? '';
  if (customDomain.length > 0) {
    return isHost(customDomain) ? `https://${customDomain}/` : null;
  }

  const slug = input.slug?.trim().toLowerCase() ?? '';
  if (!isTenantSlug(slug)) {
    return null;
  }

  const storefrontBaseUrl = input.storefrontBaseUrl?.trim() ?? '';
  if (storefrontBaseUrl.length > 0) {
    return `${storefrontBaseUrl.replace(/\/+$/, '')}/`;
  }

  const platformDomain = input.platformDomain?.trim().toLowerCase() ?? '';
  if (!isHost(platformDomain)) {
    return null;
  }

  return `https://${slug}.${platformDomain}/`;
}

export interface DevTenantHintInput {
  slug: string | null | undefined;
  /** The tenant the dev storefront is pointed at (theme-agency env). */
  storefrontTenantSlug?: string | undefined;
  isDev: boolean;
}

/**
 * True when the dev storefront is known to serve a *different* agency, so the
 * "View website" tab would open someone else's site. Unknown tenant → `false`
 * (no claim either way).
 */
export function storefrontServesAnotherTenant(input: DevTenantHintInput): boolean {
  if (!input.isDev) {
    return false;
  }

  const devTenant = input.storefrontTenantSlug?.trim().toLowerCase() ?? '';
  const slug = input.slug?.trim().toLowerCase() ?? '';
  if (devTenant.length === 0 || slug.length === 0) {
    return false;
  }

  return devTenant !== slug;
}

function isTenantSlug(value: string): boolean {
  return value.length > 0 && tenantSlugPattern.test(value);
}

function isHost(value: string): boolean {
  if (value.length === 0 || value.length > 253) {
    return false;
  }
  if (!hostPattern.test(value)) {
    return false;
  }
  return value.split('.').every((label) => label.length > 0 && label.length <= 63);
}
