import type { Testimonial } from "./types";

// TEMPORARY demo data — the agency decides which published reviews appear.
// Replace with a backend `testimonial.*` payload before production.
export const demoMainTestimonial: Testimonial = {
  id: "sarah-adam",
  name: "Sarah & Adam",
  rating: 5,
  content:
    "Every detail was taken care of. From the hotels to the local experiences, the entire trip felt effortless.",
  tour: "Santorini Escape",
  destination: "Greece",
};

export const demoSmallTestimonials: Testimonial[] = [
  {
    id: "omar-k-istanbul",
    name: "Omar K.",
    rating: 5,
    content: "The guides were amazing and the itinerary was perfectly paced.",
    tour: "Istanbul Discovery",
    destination: "Türkiye",
  },
  {
    id: "lena-r-dubai",
    name: "Lena R.",
    rating: 5,
    content: "Simple booking, honest prices, and a truly memorable trip.",
    tour: "Dubai Highlights",
    destination: "UAE",
  },
];