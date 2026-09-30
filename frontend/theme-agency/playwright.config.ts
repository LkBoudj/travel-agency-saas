import { defineConfig } from "@playwright/test";

/**
 * Theme Platform Test Target (T13): every spec runs at 3 viewports for free.
 * The suite is exercised through `tools/theme-test.mjs` (`npm run theme:test`),
 * which owns the dev-server lifecycle, so no `webServer` block is configured
 * here — the specs rely on that server being reachable at `baseURL`.
 */
const port = Number(process.env.THEME_TEST_PORT ?? 4321);

export default defineConfig({
  testDir: "tests/themes",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["github"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});