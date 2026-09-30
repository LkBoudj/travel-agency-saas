import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  Branding,
  HomePageModel,
  TourContent,
  TourSummary,
  TripsPageModel,
  TripDetailPageModel,
} from "./contracts.ts";
import { buildSeoMeta } from "./seo.ts";
import type { SeoContext, SeoInput, SeoMeta } from "./seo.ts";

const branding: Branding = {
  name: "Sahara",
  logo: null,
  tagline: "Crafted journeys, unforgettable travel",
  colors: {},
};

const paths: SeoContext["paths"] = {
  home: "/",
  trips: "/trips",
  tripDetail: (slug) => `/trips/${encodeURIComponent(slug)}`,
};

const santorini: TourContent = {
  slug: "santorini-escape",
  title: "Santorini Escape",
  excerpt: "Whitewashed cliffs and blue domes above the Aegean.",
  description: "Seven days crossing the Cyclades.",
  price: { amount: 1250, currency: "USD" },
  durationDays: 7,
  image: { src: "/demo/tours/santorini-escape.jpg", alt: "Oia at sunset" },
  destinations: ["Santorini"],
  highlights: ["Caldera sunset cruise"],
  itinerary: [{ day: 1, title: "Athens", description: "Acropolis walking tour." }],
  includes: ["Hotels"],
};

const istanbul: TourContent = {
  slug: "istanbul-discovery",
  title: "Istanbul Discovery",
  excerpt: "Two continents, one unforgettable city.",
  description: "Five days between the Bosphorus straits.",
  price: { amount: 890, currency: "USD" },
  durationDays: 5,
  highlights: ["Hagia Sophia"],
  itinerary: [{ day: 1, title: "Old City", description: "Hagia Sophia and Blue Mosque." }],
  includes: ["Hotels"],
};

function summary(tour: TourContent): TourSummary {
  return { ...tour };
}

function homePage(): HomePageModel {
  return {
    kind: "home",
    content: {
      hero: {
        eyebrow: "Explore · Dream · Travel",
        title: "Discover your next journey",
        subtitle: "Amazing destinations, carefully crafted tours await you.",
        image: { src: "/demo/hero.jpg", alt: "Santorini at golden hour" },
      },
      tours: [summary(santorini), summary(istanbul)],
      trustPoints: [],
      promotion: { title: "Save 15%" },
      testimonials: [],
      finalCta: { title: "Let's make your next journey unforgettable" },
    },
  };
}

function tripsPage(tours: TourContent[] = [santorini, istanbul]): TripsPageModel {
  return { kind: "trips", content: { tours: tours.map(summary) } };
}

function tripDetailPage(): TripDetailPageModel {
  return {
    kind: "trip-detail",
    slug: santorini.slug,
    content: { tour: santorini },
  };
}

function context(overrides: Partial<SeoContext> = {}): SeoContext {
  return {
    locale: "en",
    branding,
    paths,
    preview: false,
    page: homePage(),
    ...overrides,
  };
}

function input(overrides: Partial<SeoInput> = {}): SeoInput {
  return {
    siteUrl: "https://demo.platform.com",
    context: context(),
    ...overrides,
  };
}

function node(meta: SeoMeta, type: string): Record<string, unknown> {
  const found = meta.jsonLd.find((entry) => entry["@type"] === type);
  assert.ok(found, `expected a "${type}" JSON-LD node`);
  return found;
}

function nodeById(meta: SeoMeta, id: string): Record<string, unknown> {
  const found = meta.jsonLd.find((entry) => entry["@id"] === id);
  assert.ok(found, `expected a JSON-LD node with @id "${id}"`);
  return found;
}

test("buildSeoMeta derives home identity from the agency, not the theme", () => {
  const meta = buildSeoMeta(input());

  assert.equal(meta.title, "Sahara | Crafted journeys, unforgettable travel");
  assert.equal(meta.description, "Amazing destinations, carefully crafted tours await you.");
  assert.equal(meta.canonical, "https://demo.platform.com/");
  assert.equal(meta.robots, "index, follow");
});

test("buildSeoMeta emits hreflang for the tenant locale plus x-default", () => {
  const meta = buildSeoMeta(input());

  assert.deepEqual(meta.alternates, [
    { locale: "en", href: "https://demo.platform.com/" },
    { locale: "x-default", href: "https://demo.platform.com/" },
  ]);
});

test("buildSeoMeta maps every configured locale to a localized path", () => {
  const meta = buildSeoMeta(
    input({
      context: context({ locale: "ar", page: tripsPage() }),
      locales: ["en", "ar"],
      localizedPath: (locale, path) => `/${locale}${path === "/" ? "" : path}`,
    }),
  );

  assert.equal(meta.canonical, "https://demo.platform.com/trips");
  assert.deepEqual(meta.alternates, [
    { locale: "en", href: "https://demo.platform.com/en/trips" },
    { locale: "ar", href: "https://demo.platform.com/ar/trips" },
    { locale: "x-default", href: "https://demo.platform.com/trips" },
  ]);
});

test("buildSeoMeta titles and describes the trips index from the catalog", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripsPage() }) }));

  assert.equal(meta.title, "Tours | Sahara");
  assert.equal(meta.description, "Browse 2 curated tours from Sahara.");
  assert.equal(meta.canonical, "https://demo.platform.com/trips");
});

test("buildSeoMeta uses a singular description for a single-tour catalog", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripsPage([santorini]) }) }));

  assert.equal(meta.description, "Browse 1 curated tour from Sahara.");
});

test("buildSeoMeta describes a trip-detail page from its tour record", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripDetailPage() }) }));

  assert.equal(meta.title, "Santorini Escape | Sahara");
  assert.equal(meta.description, "Whitewashed cliffs and blue domes above the Aegean.");
  assert.equal(meta.canonical, "https://demo.platform.com/trips/santorini-escape");
});

test("buildSeoMeta falls back to the tour description when the excerpt is empty", () => {
  const tour: TourContent = { ...santorini, excerpt: "", description: "Seven days crossing the Cyclades." };
  const meta = buildSeoMeta(
    input({ context: context({ page: { kind: "trip-detail", slug: tour.slug, content: { tour } } }) }),
  );

  assert.equal(meta.description, "Seven days crossing the Cyclades.");
});

test("buildSeoMeta clamps long titles and descriptions", () => {
  const longBranding: Branding = {
    name: "Sahara Journeys",
    logo: null,
    tagline:
      "Crafted journeys, unforgettable travel, handpicked destinations and round the clock support",
    colors: {},
  };
  const longTour: TourContent = {
    ...santorini,
    title: "Santorini Escape and the Cyclades: a week across the Aegean Sea",
    excerpt: `${santorini.excerpt} ${santorini.description} ${"x".repeat(300)}`,
  };

  const home = buildSeoMeta(input({ context: context({ branding: longBranding }) }));
  assert.ok(home.title.length <= 60, `title too long: ${home.title.length}`);
  assert.ok(home.title.endsWith("…"));

  const detail = buildSeoMeta(
    input({
      context: context({
        page: { kind: "trip-detail", slug: longTour.slug, content: { tour: longTour } },
      }),
    }),
  );
  assert.ok(detail.title.length <= 60, `title too long: ${detail.title.length}`);
  assert.ok(detail.title.endsWith("…"));
  assert.ok(detail.description.length <= 160, `description too long: ${detail.description.length}`);
  assert.ok(detail.description.endsWith("…"));
});

test("buildSeoMeta describes an empty catalog without a zero count", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripsPage([]) }) }));

  assert.equal(meta.description, "Explore curated tours from Sahara.");
  assert.equal(node(meta, "ItemList")["numberOfItems"], 0);
});

test("buildSeoMeta resolves relative images against the storefront origin", () => {
  const meta = buildSeoMeta(input());

  assert.deepEqual(meta.openGraph.image, {
    url: "https://demo.platform.com/demo/hero.jpg",
    alt: "Santorini at golden hour",
  });
  assert.equal(meta.twitter.card, "summary_large_image");
});

test("buildSeoMeta omits images for a catalog page without a page image", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripsPage() }) }));

  assert.equal(meta.openGraph.image, null);
  assert.equal(meta.twitter.card, "summary");
  assert.equal(meta.twitter.image, null);
});

test("buildSeoMeta builds Open Graph metadata from agency + page", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripDetailPage() }) }));

  assert.equal(meta.openGraph.type, "website");
  assert.equal(meta.openGraph.siteName, "Sahara");
  assert.equal(meta.openGraph.locale, "en");
  assert.equal(meta.openGraph.url, "https://demo.platform.com/trips/santorini-escape");
  assert.equal(meta.openGraph.title, "Santorini Escape | Sahara");
  assert.deepEqual(meta.openGraph.image, {
    url: "https://demo.platform.com/demo/tours/santorini-escape.jpg",
    alt: "Oia at sunset",
  });
});

test("buildSeoMeta converts a region locale into the Open Graph locale form", () => {
  const meta = buildSeoMeta(input({ context: context({ locale: "ar-MA" }) }));

  assert.equal(meta.openGraph.locale, "ar_MA");
});

test("buildSeoMeta marks preview output noindex, nofollow", () => {
  const meta = buildSeoMeta(input({ context: context({ preview: true }) }));

  assert.equal(meta.robots, "noindex, nofollow");
});

test("buildSeoMeta describes the home page with agency, website and featured tours nodes", () => {
  const meta = buildSeoMeta(input());

  assert.equal(node(meta, "TravelAgency")["name"], "Sahara");
  assert.equal(node(meta, "TravelAgency")["url"], "https://demo.platform.com");
  assert.equal(node(meta, "TravelAgency")["@context"], "https://schema.org");
  assert.equal(node(meta, "WebSite")["inLanguage"], "en");
  assert.equal(node(meta, "WebPage")["@id"], "https://demo.platform.com/#webpage");
  assert.deepEqual(node(meta, "WebPage")["isPartOf"], {
    "@id": "https://demo.platform.com/#website",
  });

  const featured = node(meta, "ItemList");
  assert.equal(featured["numberOfItems"], 2);
  assert.deepEqual(
    (featured["itemListElement"] as { name: string; url: string }[]).map((item) => item.url),
    [
      "https://demo.platform.com/trips/santorini-escape",
      "https://demo.platform.com/trips/istanbul-discovery",
    ],
  );
});

test("buildSeoMeta omits the logo when the agency has none", () => {
  const meta = buildSeoMeta(input());

  assert.equal("logo" in node(meta, "TravelAgency"), false);
});

test("buildSeoMeta includes the agency logo when present", () => {
  const meta = buildSeoMeta(
    input({ context: context({ branding: { ...branding, logo: "/demo/logo.svg" } }) }),
  );

  assert.equal(node(meta, "TravelAgency")["logo"], "https://demo.platform.com/demo/logo.svg");
});

test("buildSeoMeta types the trips index as a collection page", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripsPage() }) }));

  assert.equal(node(meta, "CollectionPage")["@id"], "https://demo.platform.com/trips#webpage");
  assert.equal(node(meta, "ItemList")["numberOfItems"], 2);
});

test("buildSeoMeta offers a purchasable product and itinerary for a trip", () => {
  const meta = buildSeoMeta(input({ context: context({ page: tripDetailPage() }) }));

  assert.equal(node(meta, "ItemPage")["@id"], "https://demo.platform.com/trips/santorini-escape#webpage");

  const product = node(meta, "Product");
  assert.equal(product["name"], "Santorini Escape");
  assert.equal(product["url"], "https://demo.platform.com/trips/santorini-escape");
  assert.deepEqual(product["offers"], {
    "@type": "Offer",
    price: "1250",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://demo.platform.com/trips/santorini-escape",
  });

  const itinerary = nodeById(meta, "https://demo.platform.com/trips/santorini-escape#itinerary");
  assert.equal(itinerary["@type"], "ItemList");
  assert.equal(itinerary["numberOfItems"], 1);
});

test("buildSeoMeta omits the offer for a tour the agency has not priced", () => {
  const unpriced: TourContent = { ...santorini, price: null };
  const meta = buildSeoMeta(
    input({
      context: context({ page: { kind: "trip-detail", slug: unpriced.slug, content: { tour: unpriced } } }),
    }),
  );

  const product = node(meta, "Product");
  assert.equal(product["name"], "Santorini Escape");
  assert.equal("offers" in product, false, "an unpriced tour must not advertise an offer");
  // The itinerary stays: it is still real published content.
  assert.equal(nodeById(meta, "https://demo.platform.com/trips/santorini-escape#itinerary")["@type"], "ItemList");
});

test("buildSeoMeta is pure: the same input always yields the same output", () => {
  const first = buildSeoMeta(input({ context: context({ page: tripDetailPage() }) }));
  const second = buildSeoMeta(input({ context: context({ page: tripDetailPage() }) }));

  assert.deepEqual(first, second);
});

test("buildSeoMeta tolerates a storefront origin with a trailing slash", () => {
  const meta = buildSeoMeta(input({ siteUrl: "https://demo.platform.com/" }));

  assert.equal(meta.canonical, "https://demo.platform.com/");
  assert.equal(node(meta, "TravelAgency")["url"], "https://demo.platform.com");
});
