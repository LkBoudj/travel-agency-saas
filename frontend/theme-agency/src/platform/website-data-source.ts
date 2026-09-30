import type { StorefrontData, StorefrontDataSource } from "./data-source.ts";

/**
 * The real storefront DataSource: `published()` and `draft()` over the backend
 * public read boundary (`/v1/public/website/:slug`). Fills the seam previously
 * served by `src/fixtures/`.
 *
 * Draft fetches are the ONLY call that carries the shared preview token. The
 * token is placed here by `resolve-data-source` from the platform locals — it
 * is never client-exposed and never part of a rendered URL. A 404 on draft
 * (`WEBSITE_DRAFT_NOT_FOUND`) falls back to `published()` per the DataSource
 * contract; any token failure is fail-closed (surfaced as an error, never a
 * silent fallback).
 */

export type StorefrontDataSourceErrorCode =
  | "WEBSITE_NOT_PUBLISHED"
  | "WEBSITE_DRAFT_NOT_FOUND"
  | "WEBSITE_PREVIEW_TOKEN_INVALID"
  | "UPSTREAM";

const FAIL_SAFE_CODES = new Set<StorefrontDataSourceErrorCode>([
  "WEBSITE_NOT_PUBLISHED",
  "WEBSITE_DRAFT_NOT_FOUND",
  "WEBSITE_PREVIEW_TOKEN_INVALID",
]);

export class StorefrontDataSourceError extends Error {
  readonly code: StorefrontDataSourceErrorCode;
  readonly status: number;

  constructor(code: StorefrontDataSourceErrorCode, status: number, message: string) {
    super(message);
    this.name = "StorefrontDataSourceError";
    this.code = code;
    this.status = status;
  }
}

export interface WebsiteDataSourceOptions {
  /** Backend origin, e.g. `http://localhost:3000` (`/v1` is appended). */
  baseUrl: string;
  /** Shared preview token from the platform locals (lab renders only). */
  previewToken?: string;
  /** Underlying fetch, overridable in tests. */
  fetch?: typeof globalThis.fetch;
}

/** True when the payload is a plausible `StorefrontData` envelope. */
function isStorefrontData(value: unknown): value is StorefrontData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.config === "object" &&
    data.config !== null &&
    Array.isArray(data.tours)
  );
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/u, "");
}

export function createWebsiteDataSource(
  options: WebsiteDataSourceOptions,
): StorefrontDataSource {
  const base = normalizeBase(options.baseUrl);
  const doFetch = options.fetch ?? globalThis.fetch;

  if (!base) {
    throw new Error("createWebsiteDataSource requires a non-empty baseUrl");
  }

  function urlFor(slug: string, draft: boolean): string {
    const path = draft
      ? `/v1/public/website/${encodeURIComponent(slug)}/draft`
      : `/v1/public/website/${encodeURIComponent(slug)}`;
    return `${base}${path}`;
  }

  function errorCodeFromBody(body: unknown): StorefrontDataSourceErrorCode | undefined {
    if (typeof body === "object" && body !== null) {
      const code = (body as Record<string, unknown>).errorCode;
      if (typeof code === "string" && isStorefrontDataSourceErrorCode(code)) return code;
    }
    return undefined;
  }

  async function fetchStorefront(slug: string, draft: boolean): Promise<StorefrontData> {
    const headers: HeadersInit = { accept: "application/json" };
    if (draft && options.previewToken) {
      headers.authorization = `Bearer ${options.previewToken}`;
    }

    let response: Response;
    try {
      response = await doFetch(urlFor(slug, draft), { headers });
    } catch (cause) {
      throw new StorefrontDataSourceError(
        "UPSTREAM",
        0,
        `Storefront fetch for "${slug}" failed: ${(cause as Error).message ?? String(cause)}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    const codeFromBody = errorCodeFromBody(body);
    if (!response.ok) {
      const code = codeFromBody ?? (response.status === 404 ? "WEBSITE_NOT_PUBLISHED" : "UPSTREAM");
      throw new StorefrontDataSourceError(
        code,
        response.status,
        codeFromBody
          ? `Storefront "${slug}" returned ${response.status} (${codeFromBody})`
          : `Storefront "${slug}" returned ${response.status}`,
      );
    }

    if (!isStorefrontData(body)) {
      throw new StorefrontDataSourceError(
        "UPSTREAM",
        response.status,
        `Storefront "${slug}" returned an unreadable data envelope`,
      );
    }
    return body;
  }

  return {
    async published(tenantSlug: string): Promise<StorefrontData> {
      return fetchStorefront(tenantSlug, false);
    },

    async draft(tenantSlug: string): Promise<StorefrontData> {
      try {
        return await fetchStorefront(tenantSlug, true);
      } catch (error) {
        // No draft yet (404) → fall back to the published pieces per the
        // DataSource contract. Token failures stay fail-closed.
        if (error instanceof StorefrontDataSourceError && error.code === "WEBSITE_DRAFT_NOT_FOUND") {
          return this.published(tenantSlug);
        }
        throw error;
      }
    },
  };
}

function isStorefrontDataSourceErrorCode(value: string): value is StorefrontDataSourceErrorCode {
  return (FAIL_SAFE_CODES as Set<string>).has(value);
}