import type {
  Branding,
  ImageRef,
  PageKind,
  PageModel,
  RenderContext,
  TourContent,
  TourSummary,
} from "./contracts.ts";

/**
 * SEO engine (platform-owned, theme-independent).
 *
 * Every tag is derived from the page model, the agency identity and the locale,
 * so switching themes can never change or drop SEO. Themes receive props only
 * and never render these tags themselves — `src/platform/render-head.ts`
 * renders the result into the platform-owned `head` slot.
 */

/** Search engines truncate past this; titles are clamped to it. */
export const SEO_TITLE_MAX_LENGTH = 60;
/** Search engines truncate past this; descriptions are clamped to it. */
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

const SCHEMA_ORG = "https://schema.org";
const X_DEFAULT = "x-default";

/** Platform-owned page labels; themes do not provide SEO copy. */
const PAGE_LABELS: Record<PageKind, string> = {
  home: "Home",
  trips: "Tours",
  "trip-detail": "Tour",
};

/** WebPage subtype per page kind. */
const PAGE_SCHEMA_TYPES: Record<PageKind, string> = {
  home: "WebPage",
  trips: "CollectionPage",
  "trip-detail": "ItemPage",
};

export type SeoContext = Pick<
  RenderContext,
  "locale" | "branding" | "paths" | "page" | "preview"
>;

export interface SeoImage {
  url: string;
  alt: string;
}

export interface SeoAlternate {
  locale: string;
  href: string;
}

export interface SeoOpenGraph {
  type: "website";
  siteName: string;
  locale: string;
  title: string;
  description: string;
  url: string;
  image: SeoImage | null;
}

export interface SeoTwitter {
  card: "summary_large_image" | "summary";
  title: string;
  description: string;
  image: SeoImage | null;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  /** `noindex, nofollow` on every preview render. */
  robots: string;
  alternates: SeoAlternate[];
  openGraph: SeoOpenGraph;
  twitter: SeoTwitter;
  /** JSON-LD graph, already ordered for rendering. */
  jsonLd: Record<string, unknown>[];
}

export interface SeoInput {
  /**
   * Absolute storefront origin: the request origin (custom domain / platform
   * subdomain) or the configured Astro `site`. The DataSource has no site URL —
   * canonical URLs must not come from agency content.
   */
  siteUrl: string;
  context: SeoContext;
  /** Locales served at this path. Defaults to the tenant's own locale. */
  locales?: readonly string[];
  /**
   * Locale → path mapping. Identity while routes are locale-independent; the
   * platform supplies a prefixing function once locale routing exists.
   */
  localizedPath?: (locale: string, path: string) => string;
}

interface PageSeo {
  title: string;
  description: string;
  path: string;
  image: ImageRef | undefined;
  tours: TourSummary[];
  tour: TourContent | undefined;
}

function clampText(value: string, max: number): string {
  const text = value.replace(/\s+/gu, " ").trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const body = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${body.trimEnd()}…`;
}

function joinTitle(...parts: (string | undefined)[]): string {
  return clampText(
    parts
      .map((part) => (part ?? "").trim())
      .filter((part) => part.length > 0)
      .join(" | "),
    SEO_TITLE_MAX_LENGTH,
  );
}

function describeTrips(count: number, agencyName: string): string {
  if (count === 0) return `Explore curated tours from ${agencyName}.`;
  const noun = count === 1 ? "tour" : "tours";
  return `Browse ${count} curated ${noun} from ${agencyName}.`;
}

function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  return new URL(pathOrUrl, siteUrl).toString();
}

function absoluteImage(image: ImageRef, siteUrl: string): SeoImage {
  return { url: absoluteUrl(image.src, siteUrl), alt: image.alt };
}

/** `en` → `en`, `ar-MA` → `ar_MA` (never invents a region). */
function openGraphLocale(locale: string): string {
  return locale.replace(/-/gu, "_");
}

function buildPageSeo(
  page: PageModel,
  branding: Branding,
  paths: SeoContext["paths"],
): PageSeo {
  switch (page.kind) {
    case "home": {
      const { hero, tours } = page.content;
      return {
        title: joinTitle(branding.name, branding.tagline),
        description: clampText(hero.subtitle ?? branding.tagline ?? "", SEO_DESCRIPTION_MAX_LENGTH),
        path: paths.home,
        image: hero.image,
        tours,
        tour: undefined,
      };
    }
    case "trips": {
      const { tours } = page.content;
      return {
        title: joinTitle(PAGE_LABELS.trips, branding.name),
        description: clampText(describeTrips(tours.length, branding.name), SEO_DESCRIPTION_MAX_LENGTH),
        path: paths.trips,
        image: undefined,
        tours,
        tour: undefined,
      };
    }
    case "trip-detail": {
      const { tour } = page.content;
      return {
        title: joinTitle(tour.title, branding.name),
        description: clampText(tour.excerpt || tour.description, SEO_DESCRIPTION_MAX_LENGTH),
        path: paths.tripDetail(page.slug),
        image: tour.image,
        tours: [tour],
        tour,
      };
    }
  }
}

function buildToursList(
  pageSeo: PageSeo,
  canonical: string,
  siteUrl: string,
  paths: SeoContext["paths"],
  kind: PageKind,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_ORG,
    "@type": "ItemList",
    "@id": `${canonical}#${kind === "home" ? "featured-tours" : "tours"}`,
    name: kind === "home" ? "Featured tours" : PAGE_LABELS.trips,
    numberOfItems: pageSeo.tours.length,
    itemListElement: pageSeo.tours.map((tour, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tour.title,
      url: absoluteUrl(paths.tripDetail(tour.slug), siteUrl),
    })),
  };
}

function buildTripItinerary(tour: TourContent, canonical: string): Record<string, unknown> {
  return {
    "@context": SCHEMA_ORG,
    "@type": "ItemList",
    "@id": `${canonical}#itinerary`,
    name: "Itinerary",
    numberOfItems: tour.itinerary.length,
    itemListElement: tour.itinerary.map((day) => ({
      "@type": "ListItem",
      position: day.day,
      item: {
        "@type": "List",
        name: day.title,
        description: day.description,
      },
    })),
  };
}

function buildJsonLd(
  input: SeoInput,
  pageSeo: PageSeo,
  branding: Branding,
  locale: string,
  canonical: string,
): Record<string, unknown>[] {
  const origin = new URL(input.siteUrl).origin;
  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;

  const agency: Record<string, unknown> = {
    "@context": SCHEMA_ORG,
    "@type": "TravelAgency",
    "@id": organizationId,
    name: branding.name,
    url: origin,
  };
  if (branding.tagline) agency["description"] = branding.tagline;
  if (branding.logo) agency["logo"] = absoluteUrl(branding.logo, input.siteUrl);

  const webPage: Record<string, unknown> = {
    "@context": SCHEMA_ORG,
    "@type": PAGE_SCHEMA_TYPES[input.context.page.kind],
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: pageSeo.title,
    description: pageSeo.description,
    inLanguage: locale,
    isPartOf: { "@id": websiteId },
  };

  const graph: Record<string, unknown>[] = [
    agency,
    {
      "@context": SCHEMA_ORG,
      "@type": "WebSite",
      "@id": websiteId,
      name: branding.name,
      url: origin,
      inLanguage: locale,
      publisher: { "@id": organizationId },
    },
    webPage,
  ];

  if (input.context.page.kind === "trip-detail" && pageSeo.tour) {
    const tour = pageSeo.tour;
    const product: Record<string, unknown> = {
      "@context": SCHEMA_ORG,
      "@type": "Product",
      "@id": `${canonical}#product`,
      name: tour.title,
      description: pageSeo.description,
      url: canonical,
      brand: { "@id": organizationId },
    };
    // A tour with no published price gets no Offer: inventing a price in
    // structured data would be a lie, and an offerless Product is still valid.
    if (tour.price) {
      product["offers"] = {
        "@type": "Offer",
        price: String(tour.price.amount),
        priceCurrency: tour.price.currency,
        availability: `${SCHEMA_ORG}/InStock`,
        url: canonical,
      };
    }
    if (pageSeo.image) product["image"] = absoluteUrl(pageSeo.image.src, input.siteUrl);
    graph.push(product);
    graph.push(buildTripItinerary(tour, canonical));
  } else {
    graph.push(
      buildToursList(pageSeo, canonical, input.siteUrl, input.context.paths, input.context.page.kind),
    );
  }

  return graph;
}

export function buildSeoMeta(input: SeoInput): SeoMeta {
  const { branding, locale, page, paths, preview } = input.context;
  const pageSeo = buildPageSeo(page, branding, paths);
  const canonical = absoluteUrl(pageSeo.path, input.siteUrl);

  const locales = input.locales ?? [locale];
  const localize = input.localizedPath ?? ((_locale, path) => path);
  const alternates: SeoAlternate[] = locales.map((alternate) => ({
    locale: alternate,
    href: absoluteUrl(localize(alternate, pageSeo.path), input.siteUrl),
  }));
  alternates.push({ locale: X_DEFAULT, href: canonical });

  const image = pageSeo.image ? absoluteImage(pageSeo.image, input.siteUrl) : null;

  return {
    title: pageSeo.title,
    description: pageSeo.description,
    canonical,
    robots: preview ? "noindex, nofollow" : "index, follow",
    alternates,
    openGraph: {
      type: "website",
      siteName: branding.name,
      locale: openGraphLocale(locale),
      title: pageSeo.title,
      description: pageSeo.description,
      url: canonical,
      image,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: pageSeo.title,
      description: pageSeo.description,
      image,
    },
    jsonLd: buildJsonLd(input, pageSeo, branding, locale, canonical),
  };
}
