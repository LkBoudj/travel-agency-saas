export interface Promotion {
  badge?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel: string;
  ctaUrl: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
}