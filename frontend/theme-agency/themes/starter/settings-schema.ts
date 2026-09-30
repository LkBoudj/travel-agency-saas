import type { SettingsSchema, ThemeSettings } from "@theme-agency/sdk";

/**
 * Starter theme settings schema. Keys are validated against this schema by
 * the platform (`settings-schema.ts`); every field has a theme-owned default.
 */

export const starterSettingsSchema: SettingsSchema = {
  fields: [
    {
      key: "homepage.showFeaturedTours",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.starter.homepage.showFeaturedTours",
    },
    {
      key: "homepage.showFeaturedDestinations",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.starter.homepage.showFeaturedDestinations",
    },
    {
      key: "homepage.showWhyUs",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.starter.homepage.showWhyUs",
    },
    {
      key: "homepage.showPromotion",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.starter.homepage.showPromotion",
    },
    {
      key: "homepage.showTestimonials",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.starter.homepage.showTestimonials",
    },
    {
      key: "homepage.showFinalCta",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.starter.homepage.showFinalCta",
    },
  ],
};

export const starterSettingsDefaults: ThemeSettings = {
  "homepage.showFeaturedTours": true,
  "homepage.showFeaturedDestinations": true,
  "homepage.showWhyUs": true,
  "homepage.showPromotion": true,
  "homepage.showTestimonials": true,
  "homepage.showFinalCta": true,
};