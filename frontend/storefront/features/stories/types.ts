export interface Testimonial {
  id: string;
  name: string;
  /** Optional avatar URL. Initials fallback is used when absent. */
  avatar?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  rating: number;
  content: string;
  tour?: string;
  destination?: string;
}