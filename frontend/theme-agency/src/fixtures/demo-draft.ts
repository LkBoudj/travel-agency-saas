import type { StorefrontConfig, StorefrontData } from "../platform/data-source.ts";
import { demoAgencyConfig } from "./demo-agency.ts";
import {
  demoFinalCta,
  demoHero,
  demoPromotion,
  demoTours,
  demoTestimonials,
  demoTrustPoints,
} from "./demo-content.ts";

/**
 * Draft (unpublished) snapshot — Theme Lab preview reads this through the
 * SAME render entry as public. Draft overrides are shallow deltas on top of
 * the published data; anything untouched falls back to published.
 */

export const demoDraftConfig: StorefrontConfig = {
  ...demoAgencyConfig,
  themeId: "starter",
  settings: {
    ...demoAgencyConfig.settings,
    "homepage.showFeaturedTours": false,
  },
};

export function buildDemoDraft(): StorefrontData {
  return {
    config: demoDraftConfig,
    hero: {
      ...demoHero,
      title: "DRAFT — Discover your next journey",
    },
    tours: demoTours.map((tour) =>
      tour.slug === "santorini-escape" && tour.price
        ? { ...tour, price: { ...tour.price, amount: 1199 } }
        : tour,
    ),
    trustPoints: demoTrustPoints,
    promotion: demoPromotion,
    testimonials: demoTestimonials.map((t, index) =>
      index === 0 ? { ...t, quote: `${t.quote} (draft)` } : t,
    ),
    finalCta: demoFinalCta,
  };
}