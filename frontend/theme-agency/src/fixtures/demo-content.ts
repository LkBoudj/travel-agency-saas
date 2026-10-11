import type {
  FinalCtaContent,
  HeroContent,
  PromotionContent,
  TestimonialContent,
  TourContent,
  TrustPoint,
} from "../core/contracts.ts";

/**
 * Published demo content (icons as string keys, resolved by the theme —
 * content never imports icon components).
 */
export const demoHero: HeroContent = {
  eyebrow: "Explore · Dream · Travel",
  title: "Discover your next journey",
  subtitle:
    "Amazing destinations, carefully crafted tours, and unforgettable experiences await you.",
  image: {
    src: "/demo/bg.jpg",
    alt: "A premium travel destination",
  },
  primaryCta: { label: "Explore Tours", href: "/trips" },
  secondaryCta: { label: "View Destinations", href: "#destinations" },
  trustItems: [
    { label: "Trusted Travel Agency", icon: "shield" },
    { label: "Handpicked Destinations", icon: "star" },
    { label: "Secure Booking", icon: "lock" },
  ],
};

export const demoFinalCta: FinalCtaContent = {
  eyebrow: "Ready to travel?",
  title: "Let's make your next journey unforgettable",
  description:
    "Explore our tours or talk to our team and start planning your next adventure.",
  primaryCta: { label: "Explore Tours", href: "/trips" },
  secondaryCta: { label: "Contact Us", href: "#contact" },
};

export const demoTrustPoints: TrustPoint[] = [
  {
    id: "handpicked",
    title: "Handpicked journeys",
    description: "Every itinerary is curated by local travel experts.",
    icon: "compass",
  },
  {
    id: "support",
    title: "24/7 support",
    description: "Real humans on call before and during your trip.",
    icon: "headset",
  },
  {
    id: "secure",
    title: "Secure booking",
    description: "Flexible cancellation and protected payments.",
    icon: "shield",
  },
  {
    id: "reviews",
    title: "Loved by travelers",
    description: "Rated 4.8/5 across 700+ verified reviews.",
    icon: "star",
  },
];

export const demoPromotion: PromotionContent = {
  eyebrow: "Limited time",
  title: "Book before the end of the month and save 15%",
  description:
    "Use code SAVE15 at checkout on any tour over 5 days.",
  cta: { label: "Browse Tours", href: "/trips" },
};

export const demoTestimonials: TestimonialContent[] = [
  {
    quote: "The Santorini Escape was flawless — every detail handled.",
    author: "Maria K.",
    role: "Traveled July 2026",
  },
  {
    quote: "Istanbul Discovery felt personal, not like a tour group.",
    author: "James P.",
    role: "Traveled May 2026",
  },
  {
    quote: "Support answered our flight-change questions at midnight.",
    author: "Yasmin A.",
    role: "Traveled April 2026",
  },
];

export const demoTours: TourContent[] = [
  {
    slug: "santorini-escape",
    title: "Santorini Escape",
    excerpt: "Whitewashed cliffs and blue domes above the Aegean.",
    description:
      "Seven days crossing the Cyclades, ending among the caldera of Santorini.",
    price: { amount: 1250, currency: "USD" },
    durationDays: 7,
    image: {
      src: "/demo/tours/santorini-escape.jpg",
      alt: "Whitewashed cliffside houses and blue domes above the Aegean Sea in Santorini",
    },
    destinations: ["Santorini", "Oia"],
    icon: "sun",
    highlights: ["Caldera sunset cruise", "Wine tasting in Oia", "Beach day at Vlychada"],
    itinerary: [
      { day: 1, title: "Athens", description: "Acropolis and Plaka walking tour." },
      { day: 7, title: "Oia sunset", description: "Watch the famous caldera sunset." },
    ],
    includes: ["Hotels", "Breakfast", "Ferry transfers"],
    excludes: ["Flights", "Lunches"],
  },
  {
    slug: "istanbul-discovery",
    title: "Istanbul Discovery",
    excerpt: "Two continents, one unforgettable city.",
    description:
      "Five days between the Bosphorus straits — Hagia Sophia, bazaars and dolma.",
    price: { amount: 890, currency: "USD" },
    durationDays: 5,
    image: {
      src: "/demo/tours/istanbul-discovery.jpg",
      alt: "Hagia Sophia silhouette and minarets along the Bosphorus at sunset",
    },
    destinations: ["Istanbul"],
    icon: "compass",
    highlights: ["Hagia Sophia", "Grand Bazaar", "Bosphorus cruise"],
    itinerary: [
      { day: 1, title: "Old City", description: "Hagia Sophia and Blue Mosque." },
      { day: 5, title: "Bosphorus", description: "Morning cruise and farewell dinner." },
    ],
    includes: ["Hotels", "Breakfast", "Guided tours"],
    excludes: ["Flights"],
  },
  {
    slug: "dubai-adventure",
    title: "Dubai Adventure",
    excerpt: "Desert dunes and a skyline that never sleeps.",
    description:
      "Six days mixing desert safari, souks and the modern skyline.",
    price: { amount: 1100, currency: "USD" },
    durationDays: 6,
    image: {
      src: "/demo/tours/dubai-adventure.jpg",
      alt: "Dubai skyline rising above sand dunes during a desert dusk",
    },
    destinations: ["Dubai", "Abu Dhabi"],
    icon: "flag",
    highlights: ["Desert safari", "Burj Khalifa", "Sheikh Zayed Mosque"],
    itinerary: [
      { day: 1, title: "Arrival", description: "Downtown welcome dinner." },
      { day: 6, title: "Abu Dhabi", description: "Grand Mosque and Corniche." },
    ],
    includes: ["Hotels", "Breakfast", "Desert safari"],
    excludes: ["Flights", "Dinners"],
  },
];