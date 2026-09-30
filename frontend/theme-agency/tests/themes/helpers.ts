import { expect, type Page } from "@playwright/test";

import { signPreviewToken } from "../../src/platform/preview.ts";
import { TENANT_SLUG } from "./theme-fixtures";

/**
 * `tools/theme-test.mjs` starts the dev server with this same secret, so the
 * token signing here and the middleware verification always agree. Running
 * Playwright directly works too because both sides fall back to the default.
 */
export const PREVIEW_SECRET = process.env.PREVIEW_TOKEN_SECRET ?? "theme-test-secret";

/** Builds a signed Theme Lab URL (public `/_lab` prefix) for a theme + page. */
export async function labPath(themeId: string, page: string, query = ""): Promise<string> {
  const token = await signPreviewToken(
    { tenantSlug: TENANT_SLUG, themeId },
    { secret: PREVIEW_SECRET },
  );
  const encoded = encodeURIComponent(token);
  return `/_lab/${encodeURIComponent(themeId)}/${page}?t=${encoded}${query}`;
}

/** True when nothing overflows the viewport horizontally (responsive smoke). */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "content must not overflow the viewport horizontally").toBeLessThanOrEqual(1);
}