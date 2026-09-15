import type { Tour, TourBadge } from "@/features/tours/types";

export type { Tour, TourBadge };

export interface FeaturedToursProps {
  eyebrow?: string;
  heading?: string;
  description?: string;
  tours: Tour[];
  viewAllHref?: string;
}

export interface TourCardProps {
  tour: Tour;
}