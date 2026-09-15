import type { Testimonial } from "@/features/stories/types";

export type { Testimonial };

export type TestimonialCardVariant = "main" | "small";

export interface TravelerStoriesProps {
  eyebrow?: string;
  heading?: string;
  description?: string;
  mainTestimonial: Testimonial;
  smallTestimonials: Testimonial[];
  storiesHref?: string;
}

export interface TestimonialCardProps {
  testimonial: Testimonial;
  variant?: TestimonialCardVariant;
}