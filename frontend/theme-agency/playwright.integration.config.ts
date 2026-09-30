import { defineConfig } from "@playwright/test";

/**
 * Full-stack website integration target (T8).
 *
 * Unlike `playwright.config.ts` (visual/themes), these specs talk to a REAL
 * backend and a REAL database, so they are opt-in and never part of
 * `npm test` / `theme:test`. `tools/website-integration-test.mjs` owns the
 * storefront lifecycle and runs this config; it also injects
 * `WEBSITE_TEST_*`, the credentials + agency the specs drive.
 *
 * `baseURL` is the storefront under test — the backend origin the storefront
 * reads from is `WEBSITE_API_URL` (set by the runner), not this URL.
 */
const storefrontBaseUrl =
  process.env.STOREFRONT_BASE_URL ?? `http://localhost:${process.env.THEME_TEST_PORT ?? 4321}`;

export default defineConfig({
  testDir: "tests/integration",
  // The specs share one tenant's draft/published state, so they must not run
  // concurrently or in a different order than declared.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: storefrontBaseUrl,
    trace: "off",
  },
  projects: [{ name: "desktop", use: { viewport: { width: 1440, height: 900 } } }],
});
