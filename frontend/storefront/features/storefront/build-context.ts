import type { AgencyStorefrontConfig } from "@/features/agency/types";
import { demoDestinations } from "@/features/destinations/demo-data";
import { demoPromotion } from "@/features/promotions/demo-data";
import {
  demoMainTestimonial,
  demoSmallTestimonials,
} from "@/features/stories/demo-data";
import { demoTours } from "@/features/tours/demo-data";
import { demoFeatures } from "@/features/trust-points/demo-data";
import type {
  FinalCtaContent,
  HeroContent,
} from "@/features/agency/types";
import type { ThemeRenderContext } from "./types";

/**
 * TEMPORARY demo content — the storefront's development adapter.
 * Once the backend exists, `buildStorefrontContext` composes the public read
 * model instead. Until then all fixtures live here (platform-owned), never in
 * Theme components.
 */
const DEMO_HERO: HeroContent = {
  image: { src: "/bg.jpg", alt: "A premium travel destination" },
  eyebrow: "Explore · Dream · Travel",
  title: "Discover Your",
  accentTitle: "Next Journey",
  description:
    "Amazing destinations, carefully crafted tours, and unforgettable experiences await you.",
  primaryCta: { label: "Explore Tours", href: "#tours" },
  secondaryCta: { label: "View Destinations", href: "#destinations" },
  trustItems: [
    { label: "Trusted Travel Agency", icon: "shield" },
    { label: "Handpicked Destinations", icon: "star" },
    { label: "Secure Booking", icon: "lock" },
  ],
};

const DEMO_FINAL_CTA: FinalCtaContent = {
  eyebrow: "Ready to Travel?",
  title: "Let's make your next journey unforgettable.",
  description:
    "Explore our tours or talk to our team and start planning your next adventure.",
  primaryLabel: "Explore Tours",
  primaryUrl: "/tours",
  secondaryLabel: "Contact Us",
  secondaryUrl: "/contact",
};

export function buildStorefrontContext(
  agency: AgencyStorefrontConfig,
): ThemeRenderContext {
  return {
    locale: agency.locale,
    branding: agency.branding,
    navigation: agency.navigation,
    agency: { footer: agency.footer },
    content: {
      hero: DEMO_HERO,
      tours: demoTours,
      destinations: demoDestinations,
      trustPoints: demoFeatures,
      promotion: demoPromotion,
      testimonials: {
        main: demoMainTestimonial,
        small: demoSmallTestimonials,
      },
      finalCta: DEMO_FINAL_CTA,
      paths: {
        tours: "/tours",
        destinations: "/destinations",
        offers: "/offers",
        stories: "/stories",
      },
    },
  };
}