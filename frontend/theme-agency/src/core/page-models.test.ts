import { test } from "node:test";
import assert from "node:assert/strict";

import type { StorefrontData } from "../platform/data-source.ts";
import {
  buildHomePageModel,
  buildTripDetailPageModel,
  buildTripsPageModel,
} from "./page-models.ts";
import { demoDataSource } from "../fixtures/demo-data-source.ts";
import { demoAgencyConfig } from "../fixtures/demo-agency.ts";
import { demoTours } from "../fixtures/demo-content.ts";

async function published(): Promise<StorefrontData> {
  return demoDataSource.published("demo");
}

test("buildHomePageModel shapes home content from storefront data", async () => {
  const data = await published();
  const home = buildHomePageModel(data);
  assert.equal(home.kind, "home");
  assert.equal(home.content.hero.title, data.hero.title);
  assert.equal(home.content.tours.length, 3);
  assert.equal(home.content.tours[0].slug, "santorini-escape");
  assert.deepEqual(home.content.finalCta, data.finalCta);
});

test("buildTripsPageModel exposes every tour summary", async () => {
  const data = await published();
  const trips = buildTripsPageModel(data);
  assert.equal(trips.kind, "trips");
  assert.deepEqual(
    trips.content.tours.map((t) => t.slug),
    demoTours.map((t) => t.slug),
  );
});

test("buildTripDetailPageModel resolves a known slug and rejects unknown ones", async () => {
  const data = await published();
  const detail = buildTripDetailPageModel(data, "istanbul-discovery");
  assert.ok(detail);
  assert.equal(detail.kind, "trip-detail");
  assert.equal(detail.slug, "istanbul-discovery");
  assert.equal(detail.content.tour.title, "Istanbul Discovery");

  assert.equal(buildTripDetailPageModel(data, "no-such-tour"), undefined);
});

test("published snapshot carries the configured starter theme", async () => {
  const data = await published();
  assert.equal(data.config.tenantSlug, "demo");
  assert.equal(data.config.themeId, "starter");
  assert.equal(data.config.branding.colors.primary, "#0f766e");
  assert.equal(demoAgencyConfig.navigation.length, 4);
});

test("published and draft snapshots differ where draft overrides apply", async () => {
  const pub = await published();
  const draft = await demoDataSource.draft("demo");

  assert.equal(draft.hero.title, "DRAFT — Discover your next journey");
  assert.equal(pub.hero.title, "Discover your next journey");

  const pubSantorini = pub.tours.find((t) => t.slug === "santorini-escape");
  const draftSantorini = draft.tours.find((t) => t.slug === "santorini-escape");
  assert.equal(draftSantorini?.price?.amount, 1199);
  assert.equal(pubSantorini?.price?.amount, 1250);

  assert.equal(draft.config.settings["homepage.showFeaturedTours"], false);
  assert.equal(pub.config.settings["homepage.showFeaturedTours"], true);
});

test("demoDataSource rejects unknown tenants", async () => {
  await assert.rejects(
    () => demoDataSource.published("ghost"),
    /unknown tenant "ghost"/,
  );
  await assert.rejects(
    () => demoDataSource.draft("ghost"),
    /unknown tenant "ghost"/,
  );
});