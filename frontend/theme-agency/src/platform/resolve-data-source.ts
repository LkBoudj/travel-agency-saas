import type { StorefrontDataSource } from "./data-source.ts";
import type { PreviewLocals } from "./preview.ts";
import { createWebsiteDataSource } from "./website-data-source.ts";
import { createFixtureDataSource } from "../fixtures/demo-data-source.ts";

/**
 * Selects the DataSource the render path should use.
 *
 * The website (HTTP) source is used when the backend public boundary is
 * configured (`WEBSITE_API_URL`, or `STORE_URL` as the legacy alias) — the dev
 * build and tests otherwise fall back to fixtures, so everything keeps working
 * with no backend running. The preview token comes from the platform locals
 * (already verified by the middleware); it is never part of a URL or imports.
 */

export interface StorefrontSourceEnv {
  WEBSITE_API_URL?: string;
  STORE_URL?: string;
}

export interface StorefrontSourceLocals {
  preview?: PreviewLocals;
}

export function resolveStorefrontDataSource(
  env: StorefrontSourceEnv = {},
  locals: StorefrontSourceLocals = {},
): StorefrontDataSource {
  const baseUrl = env.WEBSITE_API_URL ?? env.STORE_URL;
  if (!baseUrl) {
    return createFixtureDataSource();
  }
  return createWebsiteDataSource({
    baseUrl,
    previewToken: locals.preview?.token,
  });
}