export type DestinationLayout = "large" | "small" | "wide";

export interface DestinationImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  country: string;
  tourCount: number;
  image: DestinationImage;
  /** Intentional crop per destination. */
  objectPosition: string;
  layout: DestinationLayout;
}