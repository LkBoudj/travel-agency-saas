import { createHmac, timingSafeEqual } from 'node:crypto';

export interface WebsitePreviewClaims {
  tenantSlug: string;
  themeId: string;
  iat: number;
  exp: number;
}

/**
 * Website preview token minting (backend side of the shared Theme Lab format).
 *
 * Token format is fixed by the storefront (`frontend/theme-agency/src/platform/
 * preview.ts`, `verifyPreviewToken`): `base64url(payload).base64url(hmac)` over
 * `{ tenantSlug, themeId, iat, exp }`, TTL 900s. The backend only SIGNS — the
 * storefront only verifies — and the shared `PREVIEW_TOKEN_SECRET` is the only
 * thing both need to agree on.
 */
export const WEBSITE_PREVIEW_TTL_SECONDS = 900;

const slugPattern = /^(?!.*--)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Theme Lab path segment for a theme id (same charset the storefront allows). */
export function isPreviewableId(value: string): boolean {
  return slugPattern.test(value);
}

/**
 * Signs a Theme Lab preview token exactly as `signPreviewToken` does on the
 * storefront, so the storefront verifier accepts it unchanged.
 */
export function signWebsitePreviewToken(
  input: { tenantSlug: string; themeId: string },
  secret: string,
  options: { nowMs?: number; ttlSeconds?: number } = {},
): string {
  const issuedAt = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const ttl = options.ttlSeconds ?? WEBSITE_PREVIEW_TTL_SECONDS;
  const claims = { tenantSlug: input.tenantSlug, themeId: input.themeId, iat: issuedAt, exp: issuedAt + ttl };

  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies a Theme Lab preview token exactly as the storefront
 * (`frontend/theme-agency/src/platform/preview.ts`, `verifyPreviewToken`) does:
 * HMAC-SHA256 over the base64url payload then `exp` against now. Returns the
 * claims on success, `null` on any failure (fail-closed — callers map this to
 * a 403, never to "not found").
 */
export function verifyWebsitePreviewToken(
  token: string | undefined | null,
  secret: string,
  options: { nowMs?: number } = {},
): WebsitePreviewClaims | null {
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [payload, signature] = parts;

  let expected: Buffer;
  try {
    expected = createHmac('sha256', secret).update(payload).digest();
  } catch {
    return null;
  }
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }

  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (
    typeof claims.tenantSlug !== 'string' ||
    typeof claims.themeId !== 'string' ||
    typeof claims.iat !== 'number' ||
    typeof claims.exp !== 'number' ||
    claims.exp <= nowSeconds
  ) {
    return null;
  }

  return {
    tenantSlug: claims.tenantSlug,
    themeId: claims.themeId,
    iat: claims.iat,
    exp: claims.exp,
  };
}