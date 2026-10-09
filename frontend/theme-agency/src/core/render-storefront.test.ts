import assert from "node:assert/strict";
import { test } from "node:test";

import { demoDataSource } from "../fixtures/demo-data-source.ts";
import type { StorefrontData, StorefrontDataSource } from "../platform/data-source.ts";
import {
  renderStorefront,
  StorefrontPageNotFoundError,
} from "../platform/render-storefront.ts";
import { buildTestTheme } from "./_test-theme.ts";

const starterTheme = buildTestTheme({ id: "starter" });
const alternateTheme = buildTestTheme({ id: "alternate" });
const registry = {
  starter: starterTheme,
  alternate: alternateTheme,
};

function createDataSource(
  publishedConfig: StorefrontData["config"],
  draftConfig: StorefrontData["config"] = publishedConfig,
): StorefrontDataSource {
  return {
    async published(tenantSlug) {
      const data = await demoDataSource.published(tenantSlug);
      return { ...data, config: publishedConfig };
    },
    async draft(tenantSlug) {
      const data = await demoDataSource.draft(tenantSlug);
      return { ...data, config: draftConfig };
    },
  };
}

async function fixtureConfig(): Promise<StorefrontData["config"]> {
  const data = await demoDataSource.published("demo");
  return data.config;
}

test("renderStorefront resolves published data, settings, and a home page", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource({
    ...config,
    settings: { "hero.showSearch": false },
  });

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "home" },
  });

  assert.equal(result.theme, starterTheme);
  assert.equal(result.context.themeId, "starter");
  assert.equal(result.context.preview, false);
  assert.equal(result.context.locale, "en");
  assert.equal(result.context.dir, "ltr");
  assert.equal(result.context.page.kind, "home");
  assert.equal(result.settings["hero.showSearch"], false);
  assert.equal(result.context.paths.home, "/");
  assert.equal(result.context.paths.trips, "/trips");
  assert.equal(result.context.paths.tripDetail("santorini escape"), "/trips/santorini%20escape");
});

test("renderStorefront falls back to the default theme for an unknown id", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource({ ...config, themeId: "not-registered" });

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "trips" },
  });

  assert.equal(result.theme, starterTheme);
  assert.equal(result.context.themeId, "starter");
  assert.equal(result.usedDefaultTheme, true);
  assert.equal(result.context.page.kind, "trips");
});

test("renderStorefront uses draft data and a forced theme for preview", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource(config, {
    ...config,
    themeId: "starter",
  });

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "home" },
    preview: true,
    themeId: "alternate",
  });

  assert.equal(result.theme, alternateTheme);
  assert.equal(result.context.themeId, "alternate");
  assert.equal(result.context.preview, true);
  assert.equal(result.context.page.kind, "home");
  if (result.context.page.kind === "home") {
    assert.equal(result.context.page.content.hero.title, "DRAFT — Discover your next journey");
  }
});

test("renderStorefront rejects an unknown trip slug with a typed error", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource(config);

  await assert.rejects(
    renderStorefront({
      dataSource,
      registry,
      tenantSlug: "demo",
      page: { kind: "trip-detail", slug: "missing-trip" },
    }),
    (error: unknown) =>
      error instanceof StorefrontPageNotFoundError && error.slug === "missing-trip",
  );
});

test("renderStorefront derives RTL from an Arabic locale", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource({ ...config, locale: "ar" });

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "trips" },
  });

  assert.equal(result.context.dir, "rtl");
});

test("renderStorefront applies preview settings overrides on top of stored settings", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource({
    ...config,
    settings: { "hero.showSearch": true, "homepage.heading": "Stored" },
  });

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "home" },
    preview: true,
    settingsOverride: { "hero.showSearch": false, "homepage.heading": "Preview" },
  });

  assert.equal(result.settings["hero.showSearch"], false);
  assert.equal(result.settings["homepage.heading"], "Preview");
});

test("renderStorefront ignores preview settings overrides absent from the theme schema", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource(config);

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "home" },
    settingsOverride: { "not.a.schema.key": "x", "homepage.maxTours": 999 },
  });

  assert.equal(result.settings["not.a.schema.key"], undefined);
  assert.equal(result.settings["homepage.maxTours"], 6);
});

test("renderStorefront honours an explicit direction override over the locale", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource({ ...config, locale: "en" });

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "home" },
    preview: true,
    dir: "rtl",
  });

  assert.equal(result.context.dir, "rtl");
  assert.equal(result.context.locale, "en");
});

test("renderStorefront resolves a custom page with title, content and slug", async () => {
  const config = await fixtureConfig();
  const baseSource = createDataSource(config);
  const dataSource: StorefrontDataSource = {
    ...baseSource,
    async published(tenantSlug) {
      const data = await baseSource.published(tenantSlug);
      return {
        ...data,
        pages: [
          {
            id: "about-page",
            title: "About Our Agency",
            slug: "/about-us",
            content: "We specialize in personalized Algerian desert expeditions.",
          },
        ],
      };
    },
  };

  const result = await renderStorefront({
    dataSource,
    registry,
    tenantSlug: "demo",
    page: { kind: "custom-page", slug: "/about-us" },
  });

  assert.equal(result.context.page.kind, "custom-page");
  assert.equal(result.context.page.slug, "/about-us");
  assert.equal(result.context.page.content.title, "About Our Agency");
  assert.equal(
    result.context.page.content.content,
    "We specialize in personalized Algerian desert expeditions.",
  );
});

test("renderStorefront rejects an unknown custom page slug with StorefrontPageNotFoundError", async () => {
  const config = await fixtureConfig();
  const dataSource = createDataSource(config);

  await assert.rejects(
    () =>
      renderStorefront({
        dataSource,
        registry,
        tenantSlug: "demo",
        page: { kind: "custom-page", slug: "/non-existent" },
      }),
    (error: unknown) => {
      assert(error instanceof StorefrontPageNotFoundError);
      assert.equal(error.slug, "/non-existent");
      return true;
    },
  );
});
