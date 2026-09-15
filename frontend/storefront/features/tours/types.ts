export type TourBadge = "best-seller" | "featured" | "limited-availability";

export interface TourImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Intentional crop. Defaults to center when absent. */
  objectPosition?: string;
}

export interface Tour {
  id: string;
  slug: string;
  title: string;
  image: TourImage;
  destination: string;
  duration: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency?: string;
  badge?: TourBadge;
}