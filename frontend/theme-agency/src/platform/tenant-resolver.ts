export type TenantResolution =
  | {
      ok: true;
      tenantSlug: string;
      source: "platform" | "custom" | "development";
    }
  | { ok: false; reason: "unrecognized-host" };

export interface TenantResolverOptions {
  platformDomain?: string;
  customDomains?: Readonly<Record<string, string>>;
  allowLocalhost?: boolean;
  localhostTenantSlug?: string;
}

const tenantSlugPattern = /^(?!.*--)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isTenantSlug(value: string): boolean {
  return tenantSlugPattern.test(value);
}

function normalizeHostname(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value || /[\s/@?#\\]/.test(value)) return null;

  try {
    const url = new URL(`http://${value}`);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

export function resolveTenantFromHostname(
  host: string,
  options: TenantResolverOptions = {},
): TenantResolution {
  const hostname = normalizeHostname(host);
  if (!hostname) return { ok: false, reason: "unrecognized-host" };

  const platformDomain =
    normalizeHostname(options.platformDomain ?? "platform.com") ?? "platform.com";
  if (hostname.endsWith(`.${platformDomain}`)) {
    const tenantSlug = hostname.slice(0, -(platformDomain.length + 1));
    if (isTenantSlug(tenantSlug)) {
      return { ok: true, tenantSlug, source: "platform" };
    }
  }

  if (
    options.allowLocalhost &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]")
  ) {
    const tenantSlug = options.localhostTenantSlug ?? "demo";
    if (isTenantSlug(tenantSlug)) {
      return { ok: true, tenantSlug, source: "development" };
    }
  }

  for (const [domain, tenantSlug] of Object.entries(options.customDomains ?? {})) {
    if (
      normalizeHostname(domain) === hostname &&
      isTenantSlug(tenantSlug)
    ) {
      return { ok: true, tenantSlug, source: "custom" };
    }
  }

  return { ok: false, reason: "unrecognized-host" };
}
