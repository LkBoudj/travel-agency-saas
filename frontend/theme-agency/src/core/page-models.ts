import type {
  FinalCtaContent,
  HeroContent,
  HomePageModel,
  PromotionContent,
  TestimonialContent,
  TourContent,
  TourSummary,
  TripDetailPageModel,
  TripsPageModel,
  TrustPoint,
} from "./contracts.ts";

/**
 * Page model constructors. The DataSource (T5, `src/platform/data-source.ts`)
 * delivers flat storefront data; these builders shape it into the per-kind
 * PageModel the RenderContext carries. Trip summaries are the full catalog
 * records (TourContent extends TourSummary).
 */

export interface StorefrontPageData {
  hero: HeroContent;
  tours: TourContent[];
  trustPoints: TrustPoint[];
  promotion: PromotionContent;
  testimonials: TestimonialContent[];
  finalCta: FinalCtaContent;
}

export function buildHomePageModel(data: StorefrontPageData): HomePageModel {
  const tourSummaries: TourSummary[] = data.tours.map((tour) => ({
    ...tour,
    // detail-only fields are ignored by the summary view
  }));
  return {
    kind: "home",
    content: {
      hero: data.hero,
      tours: tourSummaries,
      trustPoints: data.trustPoints,
      promotion: data.promotion,
      testimonials: data.testimonials,
      finalCta: data.finalCta,
    },
  };
}

export function buildTripsPageModel(data: StorefrontPageData): TripsPageModel {
  const tourSummaries: TourSummary[] = data.tours.map((tour) => ({
    ...tour,
  }));
  return {
    kind: "trips",
    content: {
      tours: tourSummaries,
    },
  };
}

export function buildTripDetailPageModel(
  data: StorefrontPageData,
  slug: string,
): TripDetailPageModel | undefined {
  const tour = data.tours.find((t) => t.slug === slug);
  if (!tour) return undefined;
  return {
    kind: "trip-detail",
    slug,
    content: { tour },
  };
}