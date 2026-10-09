import { isTenantSlug } from "./tenant-resolver.ts";

/**
 * Theme Lab preview authorization (T10).
 *
 * Preview is a platform capability, not a theme one: the platform verifies the
 * signed, short-lived token, loads the DRAFT snapshot through the SAME render
 * entry as the public route (D13), and forces the output to noindex. Nothing
 * here is framework-bound — the Astro adapter lives in `src/middleware.ts` and
 * the Theme Lab route.
 *
 * Fail-closed by construction: with no server secret every preview request is
 * a 404 rather than an unprotected render.
 */

/** Public Theme Lab URL prefix (Astro ignores routes whose folder starts with `_`). */
export const LAB_PUBLIC_PREFIX = "/_lab/";
/** Internal route the public prefix is rewritten to. */
export const LAB_INTERNAL_PREFIX = "/lab/";

/** Preview links are deliberately short-lived. */
export const PREVIEW_TOKEN_TTL_SECONDS = 900;

export interface PreviewClaims {
  tenantSlug: string;
  themeId: string;
  /** Issued at, Unix epoch seconds. */
  iat: number;
  /** Expires at, Unix epoch seconds. */
  exp: number;
}

export type PreviewVerifyFailure =
  | "missing-secret"
  | "malformed"
  | "bad-signature"
  | "expired";

export type PreviewVerifyResult =
  | { ok: true; claims: PreviewClaims }
  | { ok: false; reason: PreviewVerifyFailure };

export interface PreviewTokenOptions {
  secret: string | null | undefined;
  ttlSeconds?: number;
  /** Current time in milliseconds; defaults to `Date.now()`. */
  now?: number;
}

export class MissingPreviewSecretError extends Error {
  constructor() {
    super("PREVIEW_TOKEN_SECRET is required to sign a Theme Lab preview token");
    this.name = "MissingPreviewSecretError";
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/u.test(value)) return null;
  if (value.length % 4 === 1) return null;

  const base64 = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** HMAC-SHA256 over the encoded payload segment (no Node Buffer — workerd safe). */
async function hmac(
  secret: string,
  message: string,
  usage: "sign" | "verify",
  signature?: Uint8Array,
): Promise<Uint8Array | boolean> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  if (usage === "sign") {
    return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", key, textEncoder.encode(message)));
  }
  return globalThis.crypto.subtle.verify(
    "HMAC",
    key,
    signature as BufferSource,
    textEncoder.encode(message),
  );
}

function parseClaims(payload: string): PreviewClaims | null {
  const bytes = fromBase64Url(payload);
  if (!bytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(bytes));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const { tenantSlug, themeId, iat, exp } = parsed as Record<string, unknown>;
  if (typeof tenantSlug !== "string" || !isTenantSlug(tenantSlug)) return null;
  if (typeof themeId !== "string" || !isTenantSlug(themeId)) return null;
  if (typeof iat !== "number" || !Number.isInteger(iat)) return null;
  if (typeof exp !== "number" || !Number.isInteger(exp)) return null;
  return { tenantSlug, themeId, iat, exp };
}

export async function signPreviewToken(
  input: { tenantSlug: string; themeId: string },
  options: PreviewTokenOptions,
): Promise<string> {
  if (!options.secret) throw new MissingPreviewSecretError();

  const issuedAt = Math.floor((options.now ?? Date.now()) / 1000);
  const ttlSeconds = options.ttlSeconds ?? PREVIEW_TOKEN_TTL_SECONDS;
  const claims: PreviewClaims = {
    tenantSlug: input.tenantSlug,
    themeId: input.themeId,
    iat: issuedAt,
    exp: issuedAt + Math.floor(ttlSeconds),
  };

  const payload = toBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const signature = await hmac(options.secret, payload, "sign");
  return `${payload}.${toBase64Url(signature as Uint8Array)}`;
}

export async function verifyPreviewToken(
  token: string | null | undefined,
  options: { secret: string | null | undefined; now?: number },
): Promise<PreviewVerifyResult> {
  if (!options.secret) return { ok: false, reason: "missing-secret" };
  if (!token) return { ok: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const payload = parts[0];
  const signature = parts[1];
  if (payload === undefined || signature === undefined) {
    return { ok: false, reason: "malformed" };
  }

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return { ok: false, reason: "malformed" };

  const valid = await hmac(options.secret, payload, "verify", signatureBytes);
  if (valid !== true) return { ok: false, reason: "bad-signature" };

  const claims = parseClaims(payload);
  if (!claims) return { ok: false, reason: "malformed" };

  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  if (claims.exp <= nowSeconds) return { ok: false, reason: "expired" };

  return { ok: true, claims };
}

// ---------------------------------------------------------------------------
// Theme Lab URL contract
// ---------------------------------------------------------------------------

export type PreviewPageRequest =
  | { kind: "home" }
  | { kind: "trips" }
  | { kind: "trip-detail"; slug: string }
  | { kind: "custom-page"; slug: string };

export interface LabRequestPath {
  themeId: string;
  page: PreviewPageRequest;
}

export function isLabPath(pathname: string): boolean {
  return (
    pathname.startsWith(LAB_PUBLIC_PREFIX) || pathname.startsWith(LAB_INTERNAL_PREFIX)
  );
}

/**
 * Parses `/_lab/<themeId>/<page>` (public) or `/lab/<themeId>/<page>` (internal),
 * where `<page>` is `home`, `trips` or `trip-detail/<slug>`. Returns null for
 * anything else so the caller can fail closed.
 */
export function parseLabPath(pathname: string): LabRequestPath | null {
  const rest = pathname.startsWith(LAB_PUBLIC_PREFIX)
    ? pathname.slice(LAB_PUBLIC_PREFIX.length)
    : pathname.startsWith(LAB_INTERNAL_PREFIX)
      ? pathname.slice(LAB_INTERNAL_PREFIX.length)
      : null;
  if (!rest) return null;

  const segments = rest.split("/");
  const themeId = segments[0];
  const pageSegment = segments[1];
  const slugSegment = segments[2];
  if (!themeId || !isTenantSlug(themeId)) return null;

  if (segments.length === 2) {
    if (pageSegment === "home") return { themeId, page: { kind: "home" } };
    if (pageSegment === "trips") return { themeId, page: { kind: "trips" } };
    return null;
  }

  if (segments.length === 3 && pageSegment === "trip-detail" && slugSegment) {
    let slug: string;
    try {
      slug = decodeURIComponent(slugSegment);
    } catch {
      return null;
    }
    return slug ? { themeId, page: { kind: "trip-detail", slug } } : null;
  }

  if (segments.length === 3 && pageSegment === "page" && slugSegment) {
    let slug: string;
    try {
      slug = decodeURIComponent(slugSegment);
    } catch {
      return null;
    }
    return slug ? { themeId, page: { kind: "custom-page", slug } } : null;
  }

  return null;
}

function internalLabPath(path: LabRequestPath): string {
  const base = `${LAB_INTERNAL_PREFIX}${path.themeId}`;
  if (path.page.kind === "trip-detail") {
    return `${base}/trip-detail/${encodeURIComponent(path.page.slug)}`;
  }
  if (path.page.kind === "custom-page") {
    return `${base}/page/${encodeURIComponent(path.page.slug)}`;
  }
  return `${base}/${path.page.kind}`;
}

/** Raw settings overrides from the `s` query param; non-primitives are dropped. */
export function parseLabSettingsParam(
  value: string | null | undefined,
): Record<string, unknown> {
  if (!value) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

  const overrides: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof entry === "boolean" || typeof entry === "string" || typeof entry === "number") {
      overrides[key] = entry;
    }
  }
  return overrides;
}

export function parseLabDirParam(
  value: string | null | undefined,
): "ltr" | "rtl" | undefined {
  return value === "ltr" || value === "rtl" ? value : undefined;
}

// ---------------------------------------------------------------------------
// Middleware decision
// ---------------------------------------------------------------------------

export interface PreviewLocals {
  tenantSlug: string;
  themeId: string;
  page: PreviewPageRequest;
  /** Unvalidated overrides; the theme schema validates them downstream. */
  settings: Record<string, unknown>;
  dir?: "ltr" | "rtl";
  token: string;
}

export type PreviewDecision =
  | { type: "public" }
  | { type: "not-found" }
  | { type: "render-preview"; locals: PreviewLocals; rewriteTo?: string };

/**
 * Decides what the middleware does with a request. Public paths fall through to
 * tenant resolution; every lab path requires a valid, unexpired token for the
 * exact theme being previewed.
 */
export async function decidePreviewRequest(input: {
  pathname: string;
  searchParams: URLSearchParams;
  secret: string | null | undefined;
  now?: number;
}): Promise<PreviewDecision> {
  if (!isLabPath(input.pathname)) return { type: "public" };
  if (!input.secret) return { type: "not-found" };

  const token = input.searchParams.get("t");
  if (!token) return { type: "not-found" };

  const verification = await verifyPreviewToken(token, {
    secret: input.secret,
    now: input.now,
  });
  if (!verification.ok) return { type: "not-found" };

  const path = parseLabPath(input.pathname);
  if (!path || path.themeId !== verification.claims.themeId) {
    return { type: "not-found" };
  }

  const locals: PreviewLocals = {
    tenantSlug: verification.claims.tenantSlug,
    themeId: path.themeId,
    page: path.page,
    settings: parseLabSettingsParam(input.searchParams.get("s")),
    token,
  };
  const dir = parseLabDirParam(input.searchParams.get("d"));
  if (dir) locals.dir = dir;

  return {
    type: "render-preview",
    locals,
    ...(input.pathname.startsWith(LAB_PUBLIC_PREFIX)
      ? { rewriteTo: internalLabPath(path) }
      : {}),
  };
}
