import type { PageKind, SectionDefinition, ThemeDefinition } from "@theme-agency/sdk";
import Layout from "./Layout.astro";
import home from "./pages/home.astro";
import trips from "./pages/trips.astro";
import tripDetail from "./pages/trip-detail.astro";
import customPage from "./pages/custom-page.astro";
import Hero from "./components/Hero.astro";
import FeaturedTours from "./components/FeaturedTours.astro";
import FeaturedDestinations from "./components/FeaturedDestinations.astro";
import WhyUs from "./components/WhyUs.astro";
import PromotionalBanner from "./components/PromotionalBanner.astro";
import Testimonials from "./components/Testimonials.astro";
import FinalCta from "./components/FinalCta.astro";
import Footer from "./components/Footer.astro";
import { starterManifest } from "./manifest";
import { starterSettingsDefaults, starterSettingsSchema } from "./settings-schema";

const homeKinds: PageKind[] = ["home"];
const allKinds: PageKind[] = ["home", "trips", "trip-detail", "custom-page"];

const sections: SectionDefinition[] = [
  { id: "hero", nameKey: "sections.starter.hero", pages: homeKinds, component: Hero },
  {
    id: "featured-tours",
    nameKey: "sections.starter.featured-tours",
    pages: ["home", "trips"],
    component: FeaturedTours,
  },
  {
    id: "featured-destinations",
    nameKey: "sections.starter.featured-destinations",
    pages: homeKinds,
    component: FeaturedDestinations,
  },
  { id: "why-us", nameKey: "sections.starter.why-us", pages: homeKinds, component: WhyUs },
  {
    id: "promotion",
    nameKey: "sections.starter.promotion",
    pages: homeKinds,
    component: PromotionalBanner,
  },
  {
    id: "testimonials",
    nameKey: "sections.starter.testimonials",
    pages: homeKinds,
    component: Testimonials,
  },
  {
    id: "final-cta",
    nameKey: "sections.starter.final-cta",
    pages: homeKinds,
    component: FinalCta,
  },
  { id: "footer", nameKey: "sections.starter.footer", pages: allKinds, component: Footer },
];

export const starterTheme: ThemeDefinition = {
  ...starterManifest,
  Layout,
  pages: { home, trips, "trip-detail": tripDetail, "custom-page": customPage },
  sections,
  settings: {
    schema: starterSettingsSchema,
    defaults: starterSettingsDefaults,
  },
};

export default starterTheme;