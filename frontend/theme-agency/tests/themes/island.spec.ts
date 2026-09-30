import { expect, test } from "@playwright/test";

import { labPath } from "./helpers";
import { DEFAULT_THEME_ID, TRIP_SLUG } from "./theme-fixtures";

/**
 * Island hydration on real pages (the state transition locks in what the T11
 * probe proved manually): the Booking CTA ships SSR'd and upgrades to React.
 */
test("booking CTA hydrates and acknowledges without an endpoint", async ({ page }) => {
  await page.goto(`/trips/${TRIP_SLUG}`);

  const cta = page.locator('[data-island="booking-cta"]');
  await expect(cta.locator("h3")).toContainText("Ready to book?");
  const status = cta.locator('[role="status"]');
  await expect(status).toHaveText("No payment is taken here.");

  // `client:visible` hydrates when the island scrolls into view; scroll first
  // to trigger it, then wait until the `ssr` marker is gone so the click lands
  // on the live React button instead of the SSR'd one.
  const island = page.locator('astro-island:has([data-island="booking-cta"])');
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute("ssr", "", { timeout: 10_000 });

  await cta.locator("button").click();
  await expect(status).toHaveText("Thanks — an agent will confirm your dates shortly.");
  await expect(cta.locator("button")).toBeDisabled();
});

test("the Theme Lab toolbar bootstraps on preview pages", async ({ page }) => {
  const path = await labPath(DEFAULT_THEME_ID, "home");
  await page.goto(path);
  await expect(page.locator(`[data-theme-lab="${DEFAULT_THEME_ID}"]`)).toBeVisible();
});