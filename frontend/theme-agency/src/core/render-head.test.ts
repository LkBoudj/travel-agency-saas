import assert from "node:assert/strict";
import { test } from "node:test";

import { renderHeadMarkup } from "../platform/render-head.ts";
import type { SeoMeta } from "./seo.ts";

function meta(overrides: Partial<SeoMeta> = {}): SeoMeta {
  return {
    title: "Sahara | Crafted journeys",
    description: "Amazing destinations await you.",
    canonical: "https://demo.platform.com/",
    robots: "index, follow",
    alternates: [
      { locale: "en", href: "https://demo.platform.com/" },
      { locale: "x-default", href: "https://demo.platform.com/" },
    ],
    openGraph: {
      type: "website",
      siteName: "Sahara",
      locale: "en",
      title: "Sahara | Crafted journeys",
      description: "Amazing destinations await you.",
      url: "https://demo.platform.com/",
      image: { url: "https://demo.platform.com/demo/hero.jpg", alt: "Santorini at golden hour" },
    },
    twitter: {
      card: "summary_large_image",
      title: "Sahara | Crafted journeys",
      description: "Amazing destinations await you.",
      image: { url: "https://demo.platform.com/demo/hero.jpg", alt: "Santorini at golden hour" },
    },
    jsonLd: [
      { "@context": "https://schema.org", "@type": "TravelAgency", name: "Sahara" },
      { "@context": "https://schema.org", "@type": "WebPage", name: "Home" },
    ],
    ...overrides,
  };
}

function lines(markup: string): string[] {
  return markup.split("\n").filter((line) => line.length > 0);
}

test("renderHeadMarkup renders the core document head tags", () => {
  const lines_ = lines(renderHeadMarkup(meta()));

  assert.equal(lines_[0], "<title>Sahara | Crafted journeys</title>");
  assert.ok(lines_.includes('<meta name="description" content="Amazing destinations await you." />'));
  assert.ok(lines_.includes('<meta name="robots" content="index, follow" />'));
  assert.ok(lines_.includes('<link rel="canonical" href="https://demo.platform.com/" />'));
});

test("renderHeadMarkup renders every hreflang alternate including x-default", () => {
  const markup = renderHeadMarkup(
    meta({
      alternates: [
        { locale: "en", href: "https://demo.platform.com/en/" },
        { locale: "ar", href: "https://demo.platform.com/ar/" },
        { locale: "x-default", href: "https://demo.platform.com/" },
      ],
    }),
  );

  assert.ok(markup.includes('<link rel="alternate" hreflang="en" href="https://demo.platform.com/en/" />'));
  assert.ok(markup.includes('<link rel="alternate" hreflang="ar" href="https://demo.platform.com/ar/" />'));
  assert.ok(markup.includes('<link rel="alternate" hreflang="x-default" href="https://demo.platform.com/" />'));
  assert.equal(markup.match(/rel="alternate"/gu)?.length, 3);
});

test("renderHeadMarkup renders Open Graph and Twitter tags", () => {
  const markup = renderHeadMarkup(meta());

  assert.ok(markup.includes('<meta property="og:type" content="website" />'));
  assert.ok(markup.includes('<meta property="og:site_name" content="Sahara" />'));
  assert.ok(markup.includes('<meta property="og:locale" content="en" />'));
  assert.ok(markup.includes('<meta property="og:url" content="https://demo.platform.com/" />'));
  assert.ok(markup.includes('<meta property="og:image" content="https://demo.platform.com/demo/hero.jpg" />'));
  assert.ok(markup.includes('<meta property="og:image:alt" content="Santorini at golden hour" />'));
  assert.ok(markup.includes('<meta name="twitter:card" content="summary_large_image" />'));
  assert.ok(markup.includes('<meta name="twitter:image" content="https://demo.platform.com/demo/hero.jpg" />'));
});

test("renderHeadMarkup omits image tags when no image is available", () => {
  const base = meta();
  const markup = renderHeadMarkup(
    meta({
      openGraph: { ...base.openGraph, image: null },
      twitter: { ...base.twitter, image: null, card: "summary" },
    }),
  );

  assert.equal(markup.includes("og:image"), false);
  assert.equal(markup.includes("twitter:image"), false);
  assert.ok(markup.includes('<meta name="twitter:card" content="summary" />'));
});

test("renderHeadMarkup renders one JSON-LD script per node, in order", () => {
  const markup = renderHeadMarkup(meta());
  const scripts = [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gu)].map(
    (match) => match[1],
  );

  assert.equal(scripts.length, 2);
  assert.deepEqual(JSON.parse(scripts[0]), {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Sahara",
  });
  assert.deepEqual(JSON.parse(scripts[1]), {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Home",
  });
});

test("renderHeadMarkup escapes agency content in text and attributes", () => {
  const base = meta();
  const markup = renderHeadMarkup(
    meta({
      title: 'Tom & Jerry <b>"quoted"</b>',
      openGraph: { ...base.openGraph, title: 'Tom & Jerry <b>"quoted"</b>', siteName: 'A&B "Agency"' },
    }),
  );

  assert.ok(markup.includes('<title>Tom &amp; Jerry &lt;b&gt;"quoted"&lt;/b&gt;</title>'));
  assert.ok(markup.includes('<meta property="og:site_name" content="A&amp;B &quot;Agency&quot;" />'));
  assert.equal(markup.includes("<b>"), false);
});

test("renderHeadMarkup neutralizes a script break-out in JSON-LD", () => {
  const markup = renderHeadMarkup(
    meta({
      jsonLd: [
        { "@type": "TravelAgency", name: "</script><script>alert(1)</script>" },
      ],
    }),
  );

  assert.equal(markup.match(/<\/script>/gu)?.length, 1);
  const body = /<script type="application\/ld\+json">(.*?)<\/script>/su.exec(markup)?.[1];
  assert.ok(body?.includes("\\u003c"));
  assert.deepEqual(JSON.parse(body ?? "{}"), { "@type": "TravelAgency", name: "</script><script>alert(1)</script>" });
});

test("renderHeadMarkup renders the preview robots directive", () => {
  const markup = renderHeadMarkup(meta({ robots: "noindex, nofollow" }));

  assert.ok(markup.includes('<meta name="robots" content="noindex, nofollow" />'));
});

test("renderHeadMarkup emits only self-closed void tags", () => {
  const voidTags = lines(renderHeadMarkup(meta())).filter((line) => line.startsWith("<meta"));

  assert.ok(voidTags.length > 0);
  for (const tag of voidTags) {
    assert.ok(tag.endsWith("/>"), `not self-closed: ${tag}`);
  }
});
