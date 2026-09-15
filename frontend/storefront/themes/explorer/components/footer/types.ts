import type {
  AgencyFooterData,
  AgencyLogo,
  NavigationLink,
} from "@/features/agency/types";

export type { AgencyFooterData, AgencyLogo, NavigationLink };

export type FooterLink = NavigationLink;

export interface FooterProps {
  agencyName: string;
  logo?: AgencyLogo | null;
  footer: AgencyFooterData;
  currentYear?: number;
}