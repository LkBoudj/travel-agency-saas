import type {
  Branding,
  FinalCtaContent,
  FooterData,
  HeroContent,
  NavLink,
  PromotionContent,
  TestimonialContent,
  TourContent,
  TrustPoint,
} from "../core/contracts.ts";

/**
 * The storefront DataSource boundary.
 *
 * The engine talks to the backend ONLY through this contract (PROJECT_MAP
 * [CORE BOUNDARIES]). There is no public read API yet — `src/fixtures/` backs
 * development until the backend slice lands. Published vs draft: the preview
 * path reads `draft` snapshots through the SAME render entry as public.
 */

export interface StorefrontConfig {
  /** Tenant slug (dev fixtures use "demo"). */
  tenantSlug: string;
  locale: string;
  /** Configured theme id; unresolvable ids fall back to the default. */
  themeId: string | null;
  branding: Branding;
  navigation: NavLink[];
  footer: FooterData;
  /** Schema-validated-per-theme overrides; unknown values ignored. */
  settings: Record<string, unknown>;
}

export interface CustomPageData {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export interface StorefrontData {
  config: StorefrontConfig;
  hero: HeroContent;
  /** Full tour catalog; summaries are derived for list/home views. */
  tours: TourContent[];
  trustPoints: TrustPoint[];
  promotion: PromotionContent;
  testimonials: TestimonialContent[];
  finalCta: FinalCtaContent;
  pages?: CustomPageData[];
}

export interface StorefrontDataSource {
  /** Real, published storefront for a tenant slug. */
  published(tenantSlug: string): Promise<StorefrontData>;
  /** Unpublished draft (Theme Lab preview); falls back to published pieces. */
  draft(tenantSlug: string): Promise<StorefrontData>;
}