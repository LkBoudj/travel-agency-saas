import type {
  Destination,
  DestinationLayout,
} from "@/features/destinations/types";

export type { Destination, DestinationLayout };

export interface PopularDestinationsProps {
  eyebrow?: string;
  heading?: string;
  description?: string;
  destinations: Destination[];
  ctaHref?: string;
}

export interface DestinationCardProps {
  destination: Destination;
}