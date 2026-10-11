import type { StorefrontConfig } from "../platform/data-source.ts";

/**
 * Demo agency (development adapter). Backend has no public read API yet —
 * this is the shape the future `agency.*` storefront payload will satisfy.
 */
export const demoAgencyConfig: StorefrontConfig = {
  tenantSlug: "demo",
  locale: "en",
  themeId: "starter",
  branding: {
    name: "Sahara",
    logo: "/demo/logo.png",
    tagline: "Crafted journeys, unforgettable travel",
    colors: {
      primary: "#0f766e",
      onPrimary: "#ffffff",
      accent: "#f59e0b",
      surface: "#ffffff",
      text: "#0f172a",
    },
  },
  navigation: [
    { label: "Home", href: "/" },
    { label: "Tours", href: "/trips" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ],
  footer: {
    description:
      "Thoughtfully crafted journeys and unforgettable travel experiences.",
    columns: [
      {
        title: "Explore",
        links: [
          { label: "Tours", href: "/trips" },
          { label: "Destinations", href: "#destinations" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "#about" },
          { label: "Contact", href: "#contact" },
        ],
      },
    ],
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  settings: {
    "homepage.showFeaturedTours": true,
  },
};