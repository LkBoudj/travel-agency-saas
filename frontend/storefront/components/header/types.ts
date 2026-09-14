export interface HeaderNavLink {
  label: string;
  href: string;
}

export interface HeaderBranding {
  agencyName: string;
  logo?: {
    src: string;
    alt: string;
  } | null;
  primaryColor?: string;
}

export interface HeaderProps {
  agencyName: string;
  logo?: { src: string; alt: string } | null;
  navLinks: HeaderNavLink[];
  primaryColor?: string;
  ctaLabel?: string;
}