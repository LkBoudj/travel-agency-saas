import type { SettingsSchema } from "@/themes/contracts";

/**
 * Explorer Theme settings. Platform-owned validation contract — the
 * Dashboard will render this schema, and the template resolves values
 * against it with defaults.
 */
export const explorerSettingsSchema: SettingsSchema = {
  fields: [
    {
      key: "hero.showSearch",
      type: "boolean",
      group: "hero",
      labelKey: "settings.explorer.hero.showSearch",
    },
    {
      key: "homepage.showFeaturedTours",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.explorer.homepage.showFeaturedTours",
    },
    {
      key: "homepage.showPopularDestinations",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.explorer.homepage.showPopularDestinations",
    },
    {
      key: "homepage.showWhyChooseUs",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.explorer.homepage.showWhyChooseUs",
    },
    {
      key: "homepage.showPromotion",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.explorer.homepage.showPromotion",
    },
    {
      key: "homepage.showTestimonials",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.explorer.homepage.showTestimonials",
    },
    {
      key: "homepage.showFinalCta",
      type: "boolean",
      group: "homepage",
      labelKey: "settings.explorer.homepage.showFinalCta",
    },
  ],
};