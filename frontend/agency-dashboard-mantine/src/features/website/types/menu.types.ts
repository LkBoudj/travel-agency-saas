export interface NavigationLinkItem {
  label: string;
  href: string;
  [key: string]: unknown;
}

export interface FooterColumnItem {
  title: string;
  links: NavigationLinkItem[];
  [key: string]: unknown;
}

export interface FooterLegalItem {
  label: string;
  href: string;
  [key: string]: unknown;
}

export interface MenuItemInput {
  label: string;
  href: string;
}
