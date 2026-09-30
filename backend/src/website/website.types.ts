/**
 * Website DTOs (dashboard-facing).
 *
 * The dashboard works with the raw aggregate: agency-owned content and theme
 * settings as stored, exactly the two blades the content/theme editor split.
 * The PUBLIC read boundary composes the storefront-shaped `StorefrontDataDto`
 * from this aggregate + published tours + derived prices (T4).
 */
export interface WebsiteAggregate {
  slug: string;
  locale: string;
  themeId: string | null;
  themeSettings: Record<string, unknown>;
  content: Record<string, unknown>;
  branding: Record<string, unknown>;
  navigation: Array<Record<string, unknown>>;
  footer: Record<string, unknown>;
  /** ISO stamp of the last publish; `null` while the aggregate is a draft. */
  publishedAt: string | null;
  updatedAt: string;
}

export type WebsiteDraftResponse = WebsiteAggregate;

export interface WebsitePublishedResponse extends WebsiteAggregate {}

/** Minimal PUBLISHED tour card for the featured picker (no pricing or seats). */
export interface TourCatalogItemResponse {
  code: string;
  name: string;
  coverImageUrl: string | null;
  shortDescription: string | null;
}

export interface WebsitePreviewResponse {
  previewUrl: string;
}

// ---------------------------------------------------------------------------
// Public read boundary (T4) — mirrors the storefront `StorefrontData` contract
// (`frontend/theme-agency/src/core/contracts.ts` + `src/platform/data-source.ts`)
// so the theme-agency fetch DataSource can consume it unchanged.
// Whitelist DTOs only: internal fields (ids, statuses, currency basis, pricing
// rows, …) are never composed.
// ---------------------------------------------------------------------------

export interface NavLinkDto {
  label: string;
  href: string;
}

export interface BrandingDto {
  name: string;
  logo: string | null;
  tagline?: string;
  colors: Record<string, string>;
}

export interface FooterLinkColumnDto {
  title: string;
  links: NavLinkDto[];
}

export interface FooterDto {
  description?: string;
  columns: FooterLinkColumnDto[];
  legal?: NavLinkDto[];
}

export interface ImageRefDto {
  src: string;
  alt: string;
}

export interface CtaLinkDto {
  label: string;
  href: string;
}

export interface HeroDto {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: ImageRefDto;
  primaryCta?: CtaLinkDto;
  secondaryCta?: CtaLinkDto;
  trustItems?: { label: string; icon: string }[];
}

export interface TrustPointDto {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface PromotionDto {
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: CtaLinkDto;
}

export interface TestimonialDto {
  quote: string;
  author: string;
  role?: string;
}

export interface FinalCtaDto {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta?: CtaLinkDto;
  secondaryCta?: CtaLinkDto;
}

/** Price = cheapest OPEN-departure price of the tour; `null` when none exists. */
export interface TourPriceDto {
  amount: number;
  currency: string;
}

export interface TourPublicDto {
  slug: string;
  title: string;
  excerpt: string;
  price: TourPriceDto | null;
  durationDays: number;
  image: ImageRefDto | null;
  destinations: string[];
  /** True when the tour is selected for the homepage `featuredTourCodes`. */
  featured: boolean;
  description: string;
  highlights: string[];
  includes: string[];
  excludes?: string[];
  itinerary: { day: number; title: string; description: string }[];
}

export interface StorefrontDataDto {
  config: {
    tenantSlug: string;
    locale: string;
    themeId: string | null;
    branding: BrandingDto;
    navigation: NavLinkDto[];
    footer: FooterDto;
    settings: Record<string, unknown>;
  };
  hero: HeroDto;
  tours: TourPublicDto[];
  trustPoints: TrustPointDto[];
  promotion: PromotionDto;
  testimonials: TestimonialDto[];
  finalCta: FinalCtaDto;
}