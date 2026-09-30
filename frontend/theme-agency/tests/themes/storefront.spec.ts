import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers";
import { DEFAULT_THEME_ID, HERO_TITLE, TRIP_SLUG, TRIP_TITLE } from "./theme-fixtures";

/**
 * Public storefront pages — the default theme serves the demo tenant on
 * localhost, so these assert the safe-default rendering at every viewport.
 */
test("home renders the default theme without overflowing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText(HERO_TITLE);
  await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${DEFAULT_THEME_ID}`));
  await expectNoHorizontalOverflow(page);
});

test("trips lists the fixture tours", async ({ page }) => {
  await page.goto("/trips");
  const tourLinks = page.locator('a[href^="/trips/"]');
  expect(await tourLinks.count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator(`a[href="/trips/${TRIP_SLUG}"]`).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("trip detail renders the tour", async ({ page }) => {
  await page.goto(`/trips/${TRIP_SLUG}`);
  await expect(page.locator("h1")).toContainText(TRIP_TITLE);
  await expectNoHorizontalOverflow(page);
});