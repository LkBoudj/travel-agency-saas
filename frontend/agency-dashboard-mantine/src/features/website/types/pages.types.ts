export type PageKind = 'system' | 'custom';

export interface CustomWebsitePage {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  updatedAt: string;
}

export interface SystemWebsitePage {
  id: 'home' | 'trips';
  title: string;
  slug: string;
  kind: 'system';
  isPublished: true;
  description: string;
}

export interface WebsitePageItem {
  id: string;
  title: string;
  slug: string;
  kind: PageKind;
  isPublished: boolean;
  updatedAt?: string;
  description?: string;
}

export interface CreatePageInput {
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
}

export interface UpdatePageInput {
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
}

export interface HomeSectionsInput {
  hero: { title: string; subtitle: string; image: string };
  trustPoints: Array<{ icon: string; title: string; text: string }>;
  promotion: { eyebrow: string; title: string; text: string; ctaLabel: string; ctaHref: string };
  testimonials: Array<{ quote: string; author: string; location: string }>;
  finalCta: { title: string; subtitle: string; ctaLabel: string; ctaHref: string };
}
