import type { Destination } from "./types";

// TEMPORARY demo data — replace with the `destinations` payload from the backend.
export const demoDestinations: Destination[] = [
  {
    id: "santorini",
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    tourCount: 12,
    image: {
      src: "/tours/santorini-escape.jpg",
      alt: "White cliffside houses and blue domes above the Aegean Sea in Santorini at golden hour",
      width: 3840,
      height: 2560,
    },
    objectPosition: "50% 32%",
    layout: "large",
  },
  {
    id: "istanbul",
    slug: "istanbul",
    name: "Istanbul",
    country: "Türkiye",
    tourCount: 8,
    image: {
      src: "/tours/istanbul-discovery.jpg",
      alt: "Hagia Sophia dome and minarets silhouetted against the sunset sky above the Bosphorus",
      width: 2680,
      height: 2064,
    },
    objectPosition: "50% 58%",
    layout: "small",
  },
  {
    id: "dubai",
    slug: "dubai",
    name: "Dubai",
    country: "UAE",
    tourCount: 6,
    image: {
      src: "/tours/dubai-adventure.jpg",
      alt: "Dubai skyline rising above rolling sand dunes in the evening light",
      width: 3840,
      height: 2560,
    },
    objectPosition: "50% 42%",
    layout: "small",
  },
  {
    id: "marrakech",
    slug: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    tourCount: 9,
    image: {
      src: "/tours/marrakech.jpg",
      alt: "Marrakech old-city rooftops, the Koutoubia minaret and palm trees beneath the Atlas Mountains at dusk",
      width: 3840,
      height: 2560,
    },
    objectPosition: "50% 38%",
    layout: "wide",
  },
];