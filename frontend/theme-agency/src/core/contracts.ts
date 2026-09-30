import type { AstroComponentFactory } from "astro/runtime/server/index.js";

/**
 * Theme id used as the safe default across the platform.
 * See src/core/registry.ts for the authoritative list (T3).
 */
export type ThemeId = string;

/**
 * The platform-owned page kinds a Theme can render.
 * Routes are owned by the platform: "/" (home), "/trips" (trips),
 * "/trips/[slug]" (trip-detail).
 */
export type PageKind = "home" | "trips" | "trip-detail";

// ---------------------------------------------------------------------------
// Settings (schema-driven; validated in src/core/settings-schema.ts, T3)
// ---------------------------------------------------------------------------

export type SettingsValue = boolean | string | number;

export type SettingsFieldType =
  | "boolean"
  | "select"
  | "text"
  | "color"
  | "number";

export interface SettingsField {
  /** Unique within the theme schema. */
  key: string;
  type: SettingsFieldType;
  group: string;
  labelKey: string;
  /** Valid option set — required for `select`. */
  options?: { value: string; labelKey: string }[];
  /** Optional bounds/hints for `number`. */
  min?: number;
  max?: number;
  step?: number;
}

export interface SettingsSchema {
  fields: SettingsField[];
}

/** Resolved settings bag: defaults merged with validated overrides (T3). */
export interface ThemeSettings {
  [key: string]: SettingsValue | undefined;
}

// ---------------------------------------------------------------------------
// Content view-model (platform-owned; backed by src/fixtures/ in dev, T5)
// Themes present this contract only — they never fetch it themselves.
// ---------------------------------------------------------------------------

export interface ImageRef {
  src: string;
  alt: string;
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export type BrandColorName =
  | "primary"
  | "onPrimary"
  | "text"
  | "surface"
  | "accent";

/** Agency branding; maps onto the semantic token layer (T4), not components. */
export interface Branding {
  name: string;
  logo: string | null;
  tagline?: string;
  colors: Partial<Record<BrandColorName, string>>;
}

export interface HeroContent {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: ImageRef;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  /** Trust badges; icons are string keys resolved by the theme (no imports). */
  trustItems?: { label: string; icon: string }[];
}

export interface FinalCtaContent {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
}

export interface TrustPoint {
  id: string;
  title: string;
  description: string;
  /** Icon string key resolved by the theme (no icon imports in content). */
  icon: string;
}

export interface PromotionContent {
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: CtaLink;
}

export interface TestimonialContent {
  quote: string;
  author: string;
  role?: string;
}

export interface TourSummary {
  slug: string;
  title: string;
  excerpt: string;
  /**
   * `null` when the agency publishes no price for the tour yet (the backend
   * derives it from the cheapest OPEN departure and sends `null` when there is
   * none). Themes must render a "request a price" treatment instead of a
   * number, and SEO must not invent an offer.
   */
  price: { amount: number; currency: string } | null;
  durationDays: number;
  image?: ImageRef;
  destinations?: string[];
  /** Icon string key resolved by the theme (no icon imports in content). */
  icon?: string;
}

export interface TourContent extends TourSummary {
  description: string;
  highlights: string[];
  itinerary: { day: number; title: string; description: string }[];
  includes: string[];
  excludes?: string[];
}

export interface FooterData {
  description?: string;
  columns: { title: string; links: NavLink[] }[];
  legal?: NavLink[];
}

// ---------------------------------------------------------------------------
// Page models
// ---------------------------------------------------------------------------

export interface HomePageContent {
  hero: HeroContent;
  tours: TourSummary[];
  trustPoints: TrustPoint[];
  promotion: PromotionContent;
  testimonials: TestimonialContent[];
  finalCta: FinalCtaContent;
}

export interface TripsPageContent {
  tours: TourSummary[];
}

export interface TripDetailPageContent {
  tour: TourContent;
}

export interface HomePageModel {
  kind: "home";
  content: HomePageContent;
}

export interface TripsPageModel {
  kind: "trips";
  content: TripsPageContent;
}

export interface TripDetailPageModel {
  kind: "trip-detail";
  slug: string;
  content: TripDetailPageContent;
}

export type PageModel =
  | HomePageModel
  | TripsPageModel
  | TripDetailPageModel;

// ---------------------------------------------------------------------------
// RenderContext — the single platform-owned props bag for every theme component
// ---------------------------------------------------------------------------

export interface RenderContext {
  locale: string;
  /** Document direction derived from the locale — the platform owns this. */
  dir: "ltr" | "rtl";
  themeId: string;
  /** True when rendered through the Theme Lab / preview path (always noindex). */
  preview: boolean;
  branding: Branding;
  navigation: NavLink[];
  footer: FooterData;
  /** Platform-owned route templates (themes must not hardcode routes). */
  paths: {
    home: string;
    trips: string;
    tripDetail: (slug: string) => string;
  };
  page: PageModel;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * A reusable presentation block a Theme declares. Pages compose sections;
 * the platform never calls sections directly.
 */
export interface SectionDefinition {
  /** Unique within the theme. */
  id: string;
  nameKey: string;
  /** Page kinds this section participates in (drives the Theme Lab). */
  pages: PageKind[];
  component: AstroComponentFactory;
}

// ---------------------------------------------------------------------------
// Theme Definition — the strict Theme contract
// ---------------------------------------------------------------------------

export interface ThemeManifest {
  /** Stable registry key; must match the registry entry id (T3). */
  id: string;
  nameKey: string;
  descriptionKey: string;
  version: string;
  previewImage?: string;
}

/** Props shared by Layout, page templates and sections. */
export interface ThemeRenderProps {
  context: RenderContext;
  settings: ThemeSettings;
}

/**
 * A Theme is a pure presentation package: it receives a resolved platform
 * context and validated settings as props only. It never resolves the tenant,
 * fetches data, owns SEO, or imports platform internals.
 */
export interface ThemeDefinition extends ThemeManifest {
  Layout: AstroComponentFactory;
  /** One template per PageKind. */
  pages: Record<PageKind, AstroComponentFactory>;
  sections: SectionDefinition[];
  settings: {
    schema: SettingsSchema;
    defaults: ThemeSettings;
  };
}