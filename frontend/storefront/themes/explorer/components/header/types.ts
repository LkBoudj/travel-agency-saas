import type {
  AgencyLogo,
  NavigationLink,
} from "@/features/agency/types";

export type { AgencyLogo, NavigationLink };

export interface HeaderProps {
  agencyName: string;
  logo?: AgencyLogo | null;
  navLinks: NavigationLink[];
  ctaLabel?: string;
  ctaHref?: string;
}