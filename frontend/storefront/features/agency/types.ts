import type { LucideIcon } from "lucide-react";

export interface AgencyLogo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface AgencyBranding {
  name: string;
  primaryColor: string;
  logo: AgencyLogo | null;
}

export interface NavigationLink {
  label: string;
  href: string;
}

export type TrustPointIcon = "shield" | "star" | "lock";

export interface HeroImage {
  src: string;
  alt?: string;
}

export interface HeroContent {
  image: HeroImage;
  eyebrow: string;
  title: string;
  accentTitle?: string;
  description: string;
  primaryCta: NavigationLink;
  secondaryCta: NavigationLink;
  trustItems: { label: string; icon: TrustPointIcon }[];
}

export interface FinalCtaContent {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
}

export interface FooterNavigationColumn {
  heading: string;
  ariaLabel: string;
  links: NavigationLink[];
}

export interface ContactItem {
  id: string;
  label: string;
  value: string;
  href?: string;
  icon: LucideIcon;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
}

export interface AgencyFooterData {
  description?: string;
  navigation: {
    explore: FooterNavigationColumn;
    company: FooterNavigationColumn;
  };
  contact: ContactItem[];
  socialLinks: SocialLink[];
  legalHrefs: {
    privacy: string;
    terms: string;
  };
}

export interface AgencyStorefrontConfig {
  id: string;
  locale: string;
  activeThemeId: string | null;
  branding: AgencyBranding;
  navigation: NavigationLink[];
  footer: AgencyFooterData;
  /**
   * Per-Agency + Theme overrides. Validated against the active Theme's
   * settings schema in `themes/resolver.ts`; unknown values are ignored.
   */
  settings: Record<string, unknown>;
}