import type { SeoMeta } from "../core/seo.ts";

/**
 * Platform-owned head rendering (T9).
 *
 * SEO is never delegated to a theme: the platform builds the tags with
 * `buildSeoMeta()` and renders them here into the `head` slot that every theme
 * Layout must expose. Kept as a pure string builder so it is unit-testable
 * without an Astro runtime and so the same markup can be rendered by the public
 * route and the Theme Lab preview route.
 */

function escapeText(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/gu, "&quot;");
}

/** Keeps agency content from closing the JSON-LD `<script>` element. */
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/&/gu, "\\u0026");
}

function metaTag(attribute: "name" | "property", key: string, content: string): string {
  return `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(content)}" />`;
}

export function renderHeadMarkup(seo: SeoMeta): string {
  const tags: string[] = [
    `<title>${escapeText(seo.title)}</title>`,
    metaTag("name", "description", seo.description),
    metaTag("name", "robots", seo.robots),
    `<link rel="canonical" href="${escapeAttribute(seo.canonical)}" />`,
  ];

  for (const alternate of seo.alternates) {
    tags.push(
      `<link rel="alternate" hreflang="${escapeAttribute(alternate.locale)}" href="${escapeAttribute(alternate.href)}" />`,
    );
  }

  const { openGraph, twitter } = seo;
  tags.push(
    metaTag("property", "og:type", openGraph.type),
    metaTag("property", "og:site_name", openGraph.siteName),
    metaTag("property", "og:locale", openGraph.locale),
    metaTag("property", "og:title", openGraph.title),
    metaTag("property", "og:description", openGraph.description),
    metaTag("property", "og:url", openGraph.url),
  );
  if (openGraph.image) {
    tags.push(
      metaTag("property", "og:image", openGraph.image.url),
      metaTag("property", "og:image:alt", openGraph.image.alt),
    );
  }

  tags.push(
    metaTag("name", "twitter:card", twitter.card),
    metaTag("name", "twitter:title", twitter.title),
    metaTag("name", "twitter:description", twitter.description),
  );
  if (twitter.image) {
    tags.push(
      metaTag("name", "twitter:image", twitter.image.url),
      metaTag("name", "twitter:image:alt", twitter.image.alt),
    );
  }

  for (const entry of seo.jsonLd) {
    tags.push(`<script type="application/ld+json">${serializeJsonLd(entry)}</script>`);
  }

  return tags.join("\n");
}
