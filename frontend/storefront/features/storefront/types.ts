import type {
  AgencyBranding,
  AgencyFooterData,
  FinalCtaContent,
  HeroContent,
  NavigationLink,
} from "@/features/agency/types";
import type { Destination } from "@/features/destinations/types";
import type { Promotion } from "@/features/promotions/types";
import type { Testimonial } from "@/features/stories/types";
import type { Tour } from "@/features/tours/types";
import type { Feature } from "@/features/trust-points/types";

export interface StorefrontPaths {
  tours: string;
  destinations: string;
  offers: string;
  stories: string;
}

/**
 * The platform-owned content view-model passed to Themes as props.
 * Themes present this contract only — they never fetch it themselves.
 */
export interface StorefrontContent {
  hero: HeroContent;
  tours: Tour[];
  destinations: Destination[];
  trustPoints: Feature[];
  promotion: Promotion;
  testimonials: {
    main: Testimonial;
    small: Testimonial[];
  };
  finalCta: FinalCtaContent;
  paths: StorefrontPaths;
}

export interface ThemeRenderContext {
  locale: string;
  branding: AgencyBranding;
  navigation: NavigationLink[];
  agency: {
    footer: AgencyFooterData;
  };
  content: StorefrontContent;
}