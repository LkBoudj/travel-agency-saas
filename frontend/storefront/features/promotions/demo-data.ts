import type { Promotion } from "./types";

// TEMPORARY demo only — this is NOT real discount data.
// The 20% figure must be replaced by a backend `promotion.*` payload
// before production. Never hardcode live offers in the Theme.
export const demoPromotion: Promotion = {
  badge: "Special Offer",
  eyebrow: "Limited-Time Escape",
  title: "Your next adventure deserves a special offer",
  description: "Save up to 20% on selected tours and departures.",
  ctaLabel: "Explore Offers",
  ctaUrl: "/offers",
  image: {
    src: "/promo-maldives.jpg",
    alt: "Overwater resort villas above a turquoise Maldivian lagoon",
    width: 2400,
    height: 1100,
  },
};