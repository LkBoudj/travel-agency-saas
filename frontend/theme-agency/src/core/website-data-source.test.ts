import assert from "node:assert/strict";
import { test } from "node:test";

import type { StorefrontData } from "../platform/data-source.ts";
import type { TourContent } from "../core/contracts.ts";
import { resolveStorefrontDataSource } from "../platform/resolve-data-source.ts";
import {
  createWebsiteDataSource,
  StorefrontDataSourceError,
} from "../platform/website-data-source.ts";

function makeTour(): TourContent {
  return {
    slug: "santorini-escape",
    title: "Santorini Escape",
    excerpt: "Blue-domed towns",
    price: { amount: 1290, currency: "EUR" },
    durationDays: 5,
    description: "Santorini's caldera at golden hour.",
    highlights: ["Oia sunset", "Caldera cruise"],
    itinerary: [{ day: 1, title: "Arrival", description: "Settle in" }],
    includes: ["Stay", "Breakfast"],
  };
}

function makeStorefrontData(overrides: Partial<StorefrontData> = {}): StorefrontData {
  return {
    config: {
      tenantSlug: "atlas",
      locale: "en",
      themeId: "starter",
      branding: {
        name: "Atlas Travel",
        logo: null,
        colors: { primary: "#0f766e" },
      },
      navigation: [{ label: "Home", href: "/" }],
      footer: { columns: [] },
      settings: {},
    },
    hero: { title: "Discover the world" },
    tours: [makeTour()],
    trustPoints: [],
    promotion: { title: "Spring sale" },
    testimonials: [],
    finalCta: { title: "Plan your trip" },
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("published() maps the backend whitelist document to StorefrontData", async () => {
  const body = makeStorefrontData();
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com/",
    fetch: async (url, init) => {
      assert.equal(
        url,
        "https://api.example.com/v1/public/website/atlas",
      );
      assert.equal(new Headers(init?.headers).get("accept"), "application/json");
      assert.equal("authorization" in init!.headers!, false);
      return jsonResponse(body);
    },
  });

  const data = await source.published("atlas");
  assert.deepEqual(data, body);
});

test("published() passes a tour's null price through instead of inventing one", async () => {
  // The backend composes `price: null` when the agency publishes no OPEN
  // departure price; the storefront must not crash or fabricate an amount.
  const body = makeStorefrontData({
    tours: [makeTour(), { ...makeTour(), slug: "unpriced", price: null }],
  });
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    fetch: async () => jsonResponse(body),
  });

  const data = await source.published("atlas");
  assert.equal(data.tours[1].price, null);
});

test("published() encodes the tenant slug and tolerates a trailing slash on baseUrl", async () => {
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com///",
    fetch: async (url) => {
      assert.equal(url, "https://api.example.com/v1/public/website/my%20agency");
      return jsonResponse(makeStorefrontData());
    },
  });
  await source.published("my agency");
});

test("draft() calls the /draft route and forwards the preview token as a Bearer header", async () => {
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    previewToken: "hwc.abc",
    fetch: async (url, init) => {
      assert.equal(url, "https://api.example.com/v1/public/website/atlas/draft");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer hwc.abc");
      return jsonResponse(makeStorefrontData());
    },
  });

  const data = await source.draft("atlas");
  assert.equal(data.config.tenantSlug, "atlas");
});

test("draft() without a token does not send an authorization header", async () => {
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    fetch: async (_url, init) => {
      assert.equal(new Headers(init?.headers).has("authorization"), false);
      return jsonResponse(makeStorefrontData());
    },
  });
  await source.draft("atlas");
});

test("published() 404 maps to a typed WEBSITE_NOT_PUBLISHED error", async () => {
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    fetch: async () => jsonResponse({ errorCode: "WEBSITE_NOT_PUBLISHED", message: "nope" }, 404),
  });

  await assert.rejects(
    source.published("ghost"),
    (error: unknown) => {
      assert.ok(error instanceof StorefrontDataSourceError);
      assert.equal(error.code, "WEBSITE_NOT_PUBLISHED");
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test("draft() 403 preview-token errors are fail-closed (never fall back to published)", async () => {
  let draftCalls = 0;
  let publishedCalls = 0;
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    previewToken: "stale.token",
    fetch: async (url) => {
      if (String(url).includes("/draft")) {
        draftCalls += 1;
        return jsonResponse({ errorCode: "WEBSITE_PREVIEW_TOKEN_INVALID", message: "expired" }, 403);
      }
      publishedCalls += 1;
      return jsonResponse(makeStorefrontData());
    },
  });

  await assert.rejects(
    source.draft("atlas"),
    (error: unknown) => error instanceof StorefrontDataSourceError && error.code === "WEBSITE_PREVIEW_TOKEN_INVALID",
  );
  assert.equal(draftCalls, 1);
  assert.equal(publishedCalls, 0);
});

test("draft() 404 (no draft row) falls back to published() per the DataSource contract", async () => {
  let draftCalls = 0;
  let publishedCalls = 0;
  const published = makeStorefrontData();
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    previewToken: "hwc.abc",
    fetch: async (url, init) => {
      if (String(url).includes("/draft")) {
        draftCalls += 1;
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer hwc.abc");
        return jsonResponse({ errorCode: "WEBSITE_DRAFT_NOT_FOUND", message: "draft" }, 404);
      }
      publishedCalls += 1;
      return jsonResponse(published);
    },
  });

  const data = await source.draft("atlas");
  assert.equal(data.config.tenantSlug, published.config.tenantSlug);
  assert.equal(draftCalls, 1);
  assert.equal(publishedCalls, 1);
});

test("5xx / network failures surface as typed UPSTREAM errors", async () => {
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    fetch: async () => jsonResponse({ message: "boom" }, 500),
  });
  await assert.rejects(
    source.published("atlas"),
    (error: unknown) => error instanceof StorefrontDataSourceError && error.code === "UPSTREAM" && error.status === 500,
  );

  const flaky = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    fetch: async () => {
      throw new Error("socket hang up");
    },
  });
  await assert.rejects(
    flaky.published("atlas"),
    (error: unknown) =>
      error instanceof StorefrontDataSourceError && error.code === "UPSTREAM" && error.status === 0,
  );
});

test("a malformed 200 payload surfaces as UPSTREAM, not a silent bad render", async () => {
  const source = createWebsiteDataSource({
    baseUrl: "https://api.example.com",
    fetch: async () => jsonResponse({ whatever: true }),
  });
  await assert.rejects(
    source.published("atlas"),
    (error: unknown) => error instanceof StorefrontDataSourceError && error.code === "UPSTREAM",
  );
});

test("resolveStorefrontDataSource falls back to fixtures when no backend URL is set", async () => {
  const source = resolveStorefrontDataSource({}, {});
  const data = await source.published("demo");
  assert.equal(data.config.tenantSlug, "demo");

  await assert.rejects(source.published("nope"), /unknown tenant/);
});

test("resolveStorefrontDataSource builds a website source from WEBSITE_API_URL", async (t) => {
  const seen: string[] = [];
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    seen.push(String(input));
    return jsonResponse(makeStorefrontData());
  });
  try {
    const source = resolveStorefrontDataSource(
      { WEBSITE_API_URL: "https://api.example.com" },
      {},
    );
    const data = await source.published("atlas");
    assert.equal(data.config.tenantSlug, "atlas");
    assert.deepEqual(seen, ["https://api.example.com/v1/public/website/atlas"]);
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  }
});

test("resolveStorefrontDataSource honours the STORE_URL alias and the locals preview token", async (t) => {
  const seen: Array<{ url: string; auth?: string }> = [];
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string> | undefined;
    seen.push({ url: String(input), auth: headers?.authorization });
    return jsonResponse(makeStorefrontData());
  });
  try {
    const source = resolveStorefrontDataSource(
      { STORE_URL: "http://localhost:3000" },
      { preview: { token: "hwc.abc" } as never },
    );
    await source.draft("atlas");
    assert.deepEqual(seen, [
      {
        url: "http://localhost:3000/v1/public/website/atlas/draft",
        auth: "Bearer hwc.abc",
      },
    ]);
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  }
});