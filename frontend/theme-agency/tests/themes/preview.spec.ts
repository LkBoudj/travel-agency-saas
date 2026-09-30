import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, labPath } from "./helpers";
import { DEFAULT_THEME_ID, THEME_IDS, TRIP_SLUG } from "./theme-fixtures";

/**
 * Theme Lab / preview behaviour: noindex guarantees, theme-id fallback and
 * per-theme rendering. Token expiry (900s) is irrelevant here — every request
 * signs a fresh token at test time.
 */
test("preview output is never indexed or cached", async ({ page, request }) => {
  const path = await labPath(DEFAULT_THEME_ID, "home");
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response.headers()["cache-control"]).toContain("no-store");

  await page.goto(path);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expectNoHorizontalOverflow(page);
});

test("public pages stay indexable and cacheable", async ({ page, request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"] ?? "").not.toContain("noindex");

  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
});

test("an unknown theme id falls back to the default theme", async ({ page, request }) => {
  const path = await labPath("not-a-registered-theme", "home");
  const response = await request.get(path);
  expect(response.status()).toBe(200);

  await page.goto(path);
  await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${DEFAULT_THEME_ID}`));
  await expect(page.locator("body")).not.toHaveClass(/theme-not-a-registered-theme/);
});

test("the lab direction toggle renders rtl and stays in the viewport", async ({ page }) => {
  const path = await labPath(DEFAULT_THEME_ID, "home", "&d=rtl");
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expectNoHorizontalOverflow(page);
});

test("public pages default to ltr", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

for (const themeId of THEME_IDS) {
  test(`[${themeId}] lab renders its main pages on the requested theme`, async ({ page }) => {
    for (const pageKey of ["home", "trips", `trip-detail/${TRIP_SLUG}`]) {
      const path = await labPath(themeId, pageKey);
      await page.goto(path);
      await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${themeId}`));
      if (themeId !== DEFAULT_THEME_ID) {
        await expect(page.locator("body")).not.toHaveClass(
          new RegExp(`theme-${DEFAULT_THEME_ID}`),
        );
      }
    }
  });
}