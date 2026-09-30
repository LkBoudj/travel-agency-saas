import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Full-stack website integration (T8) — the production loop, end to end:
 *
 *   dashboard API (content/theme patch → publish → preview mint)
 *     → public boundary (published; draft behind a token)
 *     → storefront rendering the published tenant over HTTP
 *
 * This is NOT a unit test: it needs a running backend (real database) and the
 * storefront dev server wired to it, both started by
 * `tools/website-integration-test.mjs` (see that file for the env contract).
 * Credentials come from `WEBSITE_TEST_*`; without them the suite skips rather
 * than inventing an account.
 *
 * The specs drive ONE agency in order (draft → published → draft again), so
 * they are serial by design: the config pins `workers: 1` and this file pins
 * `mode: "serial"`. Two API contexts are opened once in `beforeAll` through the
 * worker-scoped `playwright` fixture (the `request` fixture is test-scoped and
 * cannot share a session across specs): `owner` is signed in, `anonymous` is not
 * — the public boundary must answer both.
 */

const API_URL = (process.env.WEBSITE_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const STOREFRONT_URL = (
  process.env.STOREFRONT_BASE_URL ?? "http://localhost:4321"
).replace(/\/+$/, "");
const EMAIL = process.env.WEBSITE_TEST_EMAIL;
const PASSWORD = process.env.WEBSITE_TEST_PASSWORD;
const AGENCY_CODE = process.env.WEBSITE_TEST_AGENCY_CODE ?? "";

const THEME_ID = "starter";
/** Starter-theme setting that hides the promotion section. */
const HIDE_PROMOTION = "homepage.showPromotion";
/** Per-run markers so a failed run is identifiable in the rendered HTML. */
const RUN = Date.now().toString(36).slice(-6);
const PUBLISHED_HERO = `PUBLISHED HERO ${RUN}`;
const DRAFT_HERO = `DRAFT HERO ${RUN}`;
const PROMOTION_TITLE = `PROMOTION ${RUN}`;
const BRAND_NAME = `Agency ${RUN}`;
const UNAVAILABLE_PRICE_LABEL = "Request a price";

const credentialsMissing = !EMAIL || !PASSWORD || !AGENCY_CODE;
const SLUG = AGENCY_CODE.toLowerCase();
const websiteBase = `${API_URL}/v1/agencies/${AGENCY_CODE}/website`;
const publicUrl = `${API_URL}/v1/public/website/${SLUG}`;

interface PublicTour {
  slug: string;
  title: string;
  price: { amount: number; currency: string } | null;
}

let owner: APIRequestContext;
let anonymous: APIRequestContext;

test.describe.configure({ mode: "serial" });

test.describe("agency website over the real backend", () => {
  test.beforeAll(async ({ playwright }) => {
    // Credentials are a hard prerequisite; the runner refuses to start without
    // them, and skipping here keeps a bare `playwright test` honest too.
    test.skip(credentialsMissing, "set WEBSITE_TEST_EMAIL/_PASSWORD/_AGENCY_CODE");
    owner = await playwright.request.newContext();
    anonymous = await playwright.request.newContext();
    const login = await owner.post(`${API_URL}/v1/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(login.status(), "the agency owner must be able to log in").toBe(200);
  });

  test.afterAll(async () => {
    await owner?.dispose();
    await anonymous?.dispose();
  });

  test("the dashboard API is the only way in: an anonymous session is rejected", async () => {
    const publish = await anonymous.post(`${websiteBase}/publish`);
    expect(publish.status()).toBe(401);
    const draft = await anonymous.get(`${websiteBase}/draft`);
    expect(draft.status()).toBe(401);
  });

  test("a cross-tenant session is refused by the website API", async ({ playwright }) => {
    const otherEmail = process.env.WEBSITE_TEST_OTHER_EMAIL;
    const otherPassword = process.env.WEBSITE_TEST_OTHER_PASSWORD;
    test.skip(
      !otherEmail || !otherPassword,
      "set WEBSITE_TEST_OTHER_EMAIL/_PASSWORD to assert the cross-tenant 403",
    );

    const other = await playwright.request.newContext();
    try {
      const login = await other.post(`${API_URL}/v1/auth/login`, {
        data: { email: otherEmail, password: otherPassword },
      });
      expect(login.status(), "the second agency owner must be able to log in").toBe(200);
      // That session owns a different agency, not `AGENCY_CODE`.
      expect((await other.get(`${websiteBase}/draft`)).status()).toBe(403);
    } finally {
      await other.dispose();
    }
  });

  test("the public boundary exposes exactly the published website, never the draft", async () => {
    const draft = await owner.get(`${websiteBase}/draft`);
    expect(draft.status()).toBe(200);
    expect(await draft.json()).toMatchObject({ slug: SLUG, locale: "en" });

    // A draft is never "published" in its own right — publishing stamps the
    // separate published row, so the draft's own flag is not the source of
    // truth. The published row is.
    const site = await owner.get(websiteBase);
    const live = await anonymous.get(publicUrl);

    if (site.status() === 404) {
      expect(live.status()).toBe(404);
      expect((await live.json()).errorCode).toBe("WEBSITE_NOT_PUBLISHED");
      return;
    }
    expect(site.status()).toBe(200);
    expect(live.status()).toBe(200);
    const published = await site.json();
    const exposed = await live.json();
    expect(exposed.config).toMatchObject({
      tenantSlug: SLUG,
      locale: published.locale,
      themeId: published.themeId,
    });
    expect(exposed.hero).toEqual(published.content.hero);
  });

  test("content and theme bodies stay in their own key-group", async () => {
    const smuggled = await owner.patch(`${websiteBase}/draft/content`, {
      data: {
        content: { hero: { title: PUBLISHED_HERO } },
        themeSettings: { [HIDE_PROMOTION]: false },
      },
    });
    expect(smuggled.status()).toBe(400);

    const smuggledBack = await owner.patch(`${websiteBase}/draft/theme`, {
      data: { themeId: THEME_ID, content: { hero: { title: PUBLISHED_HERO } } },
    });
    expect(smuggledBack.status()).toBe(400);
  });

  test("content, branding and the theme publish atomically and the storefront renders them", async ({
    page,
  }) => {
    const content = await owner.patch(`${websiteBase}/draft/content`, {
      data: {
        content: {
          hero: { title: PUBLISHED_HERO, subtitle: "published through the dashboard API" },
          promotion: { title: PROMOTION_TITLE },
        },
        branding: { name: BRAND_NAME },
      },
    });
    expect(content.status()).toBe(200);

    const theme = await owner.patch(`${websiteBase}/draft/theme`, {
      data: {
        themeId: THEME_ID,
        // `themeSettings` patches MERGE per top-level key, so the visible state
        // is pinned explicitly instead of assuming `{}` resets the settings.
        themeSettings: { [HIDE_PROMOTION]: true },
      },
    });
    expect(theme.status()).toBe(200);
    expect((await theme.json()).themeId).toBe(THEME_ID);

    const published = await owner.post(`${websiteBase}/publish`);
    expect(published.status()).toBe(200);
    const publishedBody = await published.json();
    expect(typeof publishedBody.publishedAt).toBe("string");
    expect(publishedBody.content.hero.title).toBe(PUBLISHED_HERO);

    // The published boundary answers an unauthenticated caller…
    const publicResponse = await anonymous.get(publicUrl);
    expect(publicResponse.status()).toBe(200);
    const publicJson = await publicResponse.json();
    expect(publicJson.config).toMatchObject({ tenantSlug: SLUG, themeId: THEME_ID });
    expect(publicJson.hero.title).toBe(PUBLISHED_HERO);

    // …and the storefront renders exactly that, indexable, on the active theme.
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(PUBLISHED_HERO);
    await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${THEME_ID}`));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.getByText(PROMOTION_TITLE).first()).toBeVisible();
    await expect(page.getByText(BRAND_NAME).first()).toBeVisible();
  });

  test("every published tour is reachable, an unpriced one renders, a missing one 404s", async ({
    page,
  }) => {
    const tours = (await (await anonymous.get(publicUrl)).json()).tours as PublicTour[];
    test.skip(tours.length === 0, "this agency publishes no tours yet");

    await page.goto("/trips");
    await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${THEME_ID}`));
    const links = page.locator('a[href^="/trips/"]');
    // Nothing beyond the published set is listed, so a draft cannot leak.
    await expect(links).toHaveCount(tours.length);
    for (const tour of tours) {
      await expect(page.locator(`a[href="/trips/${tour.slug}"]`).first()).toBeVisible();
    }
    if (tours.some((tour) => tour.price === null)) {
      await expect(page.getByText(UNAVAILABLE_PRICE_LABEL).first()).toBeVisible();
    }

    const priced = tours.find((tour) => tour.price !== null);
    if (priced) {
      await expect(page.locator(`a[href="/trips/${priced.slug}"]`).first()).toContainText(
        priced.price!.currency,
      );
    }

    await page.goto(`/trips/${tours[0].slug}`);
    await expect(page.locator("h1")).toContainText(tours[0].title);

    const missing = await page.goto("/trips/no-such-tour-here");
    expect(missing?.status()).toBe(404);
  });

  test("an unpublished draft edit never reaches the public site", async ({ page }) => {
    const draftOnly = await owner.patch(`${websiteBase}/draft/content`, {
      data: { content: { hero: { title: DRAFT_HERO } } },
    });
    expect(draftOnly.status()).toBe(200);

    expect((await (await anonymous.get(publicUrl)).json()).hero.title).toBe(PUBLISHED_HERO);

    await page.goto("/");
    await expect(page.locator("h1")).toContainText(PUBLISHED_HERO);
    await expect(page.getByText(DRAFT_HERO)).toHaveCount(0);
  });

  test("the minted preview link shows the draft, hides the site, and applies theme settings", async ({
    page,
  }) => {
    // Hide the promotion section in the DRAFT only: the published site keeps it.
    const themed = await owner.patch(`${websiteBase}/draft/theme`, {
      data: { themeSettings: { [HIDE_PROMOTION]: false } },
    });
    expect(themed.status()).toBe(200);

    const minted = await owner.post(`${websiteBase}/preview`, { data: { page: "home" } });
    expect(minted.status()).toBe(201);
    const previewUrl = new URL((await minted.json()).previewUrl as string);
    expect(
      previewUrl.origin,
      "the backend's STOREFRONT_BASE_URL must match the storefront under test",
    ).toBe(new URL(STOREFRONT_URL).origin);
    expect(previewUrl.pathname).toBe(`/_lab/${THEME_ID}/home`);
    const previewPath = `${previewUrl.pathname}${previewUrl.search}`;

    const response = await anonymous.get(previewPath);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response.headers()["cache-control"]).toContain("no-store");

    await page.goto(previewPath);
    await expect(page.locator("h1")).toContainText(DRAFT_HERO);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${THEME_ID}`));
    await expect(page.getByText(PROMOTION_TITLE)).toHaveCount(0);

    // …while the published site is untouched by the draft's theme settings.
    await page.goto("/");
    await expect(page.getByText(PROMOTION_TITLE).first()).toBeVisible();
  });

  test("the preview gate fails closed", async ({ page }) => {
    const minted = await owner.post(`${websiteBase}/preview`, { data: { page: "home" } });
    const previewUrl = new URL((await minted.json()).previewUrl as string);
    const valid = `${previewUrl.pathname}${previewUrl.search}`;

    for (const path of [
      `/_lab/${THEME_ID}/home`, // no token at all
      `${valid}tampered`, // corrupted signature
      `${previewUrl.pathname}?t=not-a-token`, // structurally invalid
    ]) {
      expect((await anonymous.get(path)).status(), `fail-closed 404 for ${path}`).toBe(404);
      expect((await page.goto(path))?.status()).toBe(404);
      await expect(page.getByText(DRAFT_HERO)).toHaveCount(0);
    }
  });

  test("the public draft boundary is token-gated", async () => {
    const missing = await anonymous.get(`${publicUrl}/draft`);
    expect(missing.status()).toBe(403);
    expect((await missing.json()).errorCode).toBe("WEBSITE_PREVIEW_TOKEN_INVALID");

    const forged = await anonymous.get(`${publicUrl}/draft`, {
      headers: { authorization: "Bearer forged.token.value" },
    });
    expect(forged.status()).toBe(403);
  });
});
