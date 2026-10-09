import type {
  CtaLinkDto,
  CustomPageDto,
  FooterDto,
  HeroDto,
  ImageRefDto,
  NavLinkDto,
  PromotionDto,
  StorefrontDataDto,
  TestimonialDto,
  TourPriceDto,
  TourPublicDto,
  TrustPointDto,
} from './website.types.js';

/**
 * Pure composition of the storefront-facing `StorefrontDataDto` from the
 * stored website aggregate + the agency's PUBLISHED tours (T4).
 *
 * This is the public read boundary's whitelist: only the fields the storefront
 * contract (`frontend/theme-agency/src/core/contracts.ts`) renders are emitted,
 * and every stored value is normalized with sane fallbacks. Internal fields
 * (ids, statuses, departure/pricing rows, currency basis, …) never cross it.
 */

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function pickNavigation(value: unknown): NavLinkDto[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }
    const label = nonEmpty((entry as Record<string, unknown>).label);
    const href = nonEmpty((entry as Record<string, unknown>).href);
    return label && href ? [{ label, href }] : [];
  });
}

export function pickBranding(value: unknown): {
  name?: string;
  tagline?: string;
  logo?: string | null;
} {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    name: nonEmpty(raw.name),
    tagline: nonEmpty(raw.tagline),
    logo: typeof raw.logo === 'string' && raw.logo.trim().length > 0 ? raw.logo.trim() : null,
  };
}

export function pickFooter(value: unknown): FooterDto {
  if (typeof value !== 'object' || value === null) {
    return { columns: [] };
  }
  const raw = value as Record<string, unknown>;
  const description = nonEmpty(raw.description);
  const columns = Array.isArray(raw.columns)
    ? raw.columns.flatMap((column) => {
        if (typeof column !== 'object' || column === null) {
          return [];
        }
        const title = nonEmpty((column as Record<string, unknown>).title);
        const links = pickNavigation((column as Record<string, unknown>).links);
        return title ? [{ title, links }] : [];
      })
    : [];
  const legal = pickNavigation(raw.legal);
  return {
    ...(description ? { description } : {}),
    columns,
    ...(legal.length > 0 ? { legal } : {}),
  };
}

export interface StoredWebsiteContent {
  hero?: { image?: string; title?: string; subtitle?: string };
  trustPoints?: { icon?: string; title?: string; text?: string }[];
  promotion?: {
    eyebrow?: string;
    title?: string;
    text?: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
  testimonials?: { quote?: string; author?: string; location?: string }[];
  finalCta?: { title?: string; subtitle?: string; ctaLabel?: string; ctaHref?: string };
  featuredTourCodes?: string[];
}

/** Whitelist pick of the stored free-form `content` JSON — unknown keys never leak. */
export function pickContent(value: Record<string, unknown>): StoredWebsiteContent {
  const content: StoredWebsiteContent = {};

  const hero = value.hero;
  if (typeof hero === 'object' && hero !== null) {
    const h = hero as Record<string, unknown>;
    content.hero = {
      ...(typeof h.image === 'string' ? { image: h.image } : {}),
      ...(typeof h.title === 'string' ? { title: h.title } : {}),
      ...(typeof h.subtitle === 'string' ? { subtitle: h.subtitle } : {}),
    };
  }

  const trustPoints = value.trustPoints;
  if (Array.isArray(trustPoints)) {
    content.trustPoints = trustPoints.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return [];
      }
      const raw = entry as Record<string, unknown>;
      return [
        {
          ...(typeof raw.icon === 'string' ? { icon: raw.icon } : {}),
          ...(typeof raw.title === 'string' ? { title: raw.title } : {}),
          ...(typeof raw.text === 'string' ? { text: raw.text } : {}),
        },
      ];
    });
  }

  const promotion = value.promotion;
  if (typeof promotion === 'object' && promotion !== null) {
    const p = promotion as Record<string, unknown>;
    content.promotion = {
      ...(typeof p.eyebrow === 'string' ? { eyebrow: p.eyebrow } : {}),
      ...(typeof p.title === 'string' ? { title: p.title } : {}),
      ...(typeof p.text === 'string' ? { text: p.text } : {}),
      ...(typeof p.ctaLabel === 'string' ? { ctaLabel: p.ctaLabel } : {}),
      ...(typeof p.ctaHref === 'string' ? { ctaHref: p.ctaHref } : {}),
    };
  }

  const testimonials = value.testimonials;
  if (Array.isArray(testimonials)) {
    content.testimonials = testimonials.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return [];
      }
      const raw = entry as Record<string, unknown>;
      return [
        {
          ...(typeof raw.quote === 'string' ? { quote: raw.quote } : {}),
          ...(typeof raw.author === 'string' ? { author: raw.author } : {}),
          ...(typeof raw.location === 'string' ? { location: raw.location } : {}),
        },
      ];
    });
  }

  const finalCta = value.finalCta;
  if (typeof finalCta === 'object' && finalCta !== null) {
    const f = finalCta as Record<string, unknown>;
    content.finalCta = {
      ...(typeof f.title === 'string' ? { title: f.title } : {}),
      ...(typeof f.subtitle === 'string' ? { subtitle: f.subtitle } : {}),
      ...(typeof f.ctaLabel === 'string' ? { ctaLabel: f.ctaLabel } : {}),
      ...(typeof f.ctaHref === 'string' ? { ctaHref: f.ctaHref } : {}),
    };
  }

  const featuredTourCodes = value.featuredTourCodes;
  if (Array.isArray(featuredTourCodes)) {
    content.featuredTourCodes = featuredTourCodes.filter(
      (code): code is string => typeof code === 'string',
    );
  }

  return content;
}

export interface TourComposeSource {
  code: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  coverImageUrl: string | null;
  days: number | null;
  nights: number | null;
  hours: number | null;
  highlights: unknown;
  included: unknown;
  notIncluded: unknown;
  destinations: { place: string | null; locality: string | null }[];
  itinerary: { position: number; title: string; description: string }[];
  departures: { prices: { amount: number; currency: string }[] }[];
}

/** Cheapest price across OPEN departures; `null` when no departure has prices. */
export function composeTourPrice(
  source: Pick<TourComposeSource, 'departures'>,
): TourPriceDto | null {
  let cheapest: TourPriceDto | null = null;
  for (const departure of source.departures) {
    for (const price of departure.prices) {
      if (!cheapest || price.amount < cheapest.amount) {
        cheapest = { amount: price.amount, currency: price.currency };
      }
    }
  }
  return cheapest;
}

export function composeDurationDays(source: {
  days: number | null;
  nights: number | null;
  hours: number | null;
}): number {
  if (source.days !== null && source.days > 0) {
    return source.days;
  }
  if (source.nights !== null && source.nights > 0) {
    return source.nights;
  }
  return 1;
}

export function composeTour(source: TourComposeSource, featuredSet: Set<string>): TourPublicDto {
  const destinations = Array.from(
    new Set(
      source.destinations.flatMap((destination) => {
        const value = destination.place ?? destination.locality;
        const trimmed = nonEmpty(value);
        return trimmed ? [trimmed] : [];
      }),
    ),
  );

  const image: ImageRefDto | null = source.coverImageUrl
    ? { src: source.coverImageUrl, alt: source.name }
    : null;

  return {
    slug: source.code,
    title: source.name,
    excerpt: source.shortDescription ?? source.name,
    price: composeTourPrice(source),
    durationDays: composeDurationDays(source),
    image,
    destinations,
    featured: featuredSet.has(source.code),
    description: source.description ?? '',
    highlights: asStringArray(source.highlights),
    includes: asStringArray(source.included),
    excludes: asStringArray(source.notIncluded),
    itinerary: source.itinerary.map((day) => ({
      day: day.position,
      title: day.title,
      description: day.description,
    })),
  };
}

function cta(label: string | undefined, href: string | undefined): CtaLinkDto | undefined {
  return label && href ? { label, href } : undefined;
}

export interface StorefrontComposeSource {
  tenantSlug: string;
  locale: string;
  /** The theme to render — the draft's stored choice, or the preview claim. */
  themeId: string | null;
  agencyName: string;
  branding: unknown;
  navigation: unknown;
  footer: unknown;
  themeSettings: unknown;
  content: Record<string, unknown>;
  tours: TourPublicDto[];
  isDraft?: boolean;
}

export const RESERVED_CUSTOM_PAGE_SLUGS = new Set([
  '',
  '/',
  '/home',
  '/trips',
  '/lab',
  '/_lab',
  '/themes.json',
  '/api',
  '/admin',
]);

export function pickCustomPages(
  value: unknown,
  isDraft = false,
): CustomPageDto[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }
    const raw = entry as Record<string, unknown>;
    const id = nonEmpty(raw.id);
    const title = nonEmpty(raw.title);
    const rawSlug = nonEmpty(raw.slug);
    if (!id || !title || !rawSlug) {
      return [];
    }
    const formattedSlug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;
    if (RESERVED_CUSTOM_PAGE_SLUGS.has(formattedSlug.toLowerCase())) {
      return [];
    }
    const isPublished = raw.isPublished !== false;
    if (!isDraft && !isPublished) {
      return [];
    }
    const content = typeof raw.content === 'string' ? raw.content : '';
    return [{ id, title, slug: formattedSlug, content }];
  });
}

export function composeHero(
  content: StoredWebsiteContent,
  agencyName: string,
): HeroDto {
  const hero = content.hero;
  if (!hero) {
    return { title: agencyName };
  }
  return {
    title: hero.title ?? agencyName,
    ...(hero.subtitle ? { subtitle: hero.subtitle } : {}),
    ...(hero.image
      ? { image: { src: hero.image, alt: hero.title ?? agencyName } }
      : {}),
  };
}

export function composePromotion(
  content: StoredWebsiteContent,
  agencyName: string,
): PromotionDto {
  const promotion = content.promotion;
  if (!promotion) {
    return { title: agencyName };
  }
  return {
    ...(promotion.eyebrow ? { eyebrow: promotion.eyebrow } : {}),
    title: promotion.title ?? agencyName,
    ...(promotion.text ? { description: promotion.text } : {}),
    ...(cta(promotion.ctaLabel, promotion.ctaHref) ? { cta: cta(promotion.ctaLabel, promotion.ctaHref)! } : {}),
  };
}

export function composeTrustPoints(content: StoredWebsiteContent): TrustPointDto[] {
  return (content.trustPoints ?? []).map((point, index) => ({
    id: `t${index}`,
    title: point.title ?? '',
    description: point.text ?? '',
    icon: point.icon ?? '',
  }));
}

export function composeTestimonials(content: StoredWebsiteContent): TestimonialDto[] {
  return (content.testimonials ?? []).map((item) => ({
    quote: item.quote ?? '',
    author: item.author ?? 'Traveler',
    ...(item.location ? { role: item.location } : {}),
  }));
}

export function composeFinalCta(
  content: StoredWebsiteContent,
  agencyName: string,
): { title: string; description?: string; primaryCta?: CtaLinkDto } {
  const finalCta = content.finalCta;
  if (!finalCta) {
    return { title: agencyName };
  }
  return {
    title: finalCta.title ?? agencyName,
    ...(finalCta.subtitle ? { description: finalCta.subtitle } : {}),
    ...(cta(finalCta.ctaLabel, finalCta.ctaHref)
      ? { primaryCta: cta(finalCta.ctaLabel, finalCta.ctaHref)! }
      : {}),
  };
}

/**
 * Orders tours for the homepage: `featuredTourCodes` first (in the stored
 * order), then every remaining tour in catalog order (newest first).
 */
export function orderFeaturedTours(
  tours: TourPublicDto[],
  featuredTourCodes: string[] | undefined,
): TourPublicDto[] {
  const featured = featuredTourCodes ?? [];
  const order = new Map(featured.map((code, index) => [code, index]));
  const indexed = tours.map((tour, index) => ({ tour, index }));

  indexed.sort((a, b) => {
    const aFeatured = order.has(a.tour.slug);
    const bFeatured = order.has(b.tour.slug);
    if (aFeatured && bFeatured) {
      return order.get(a.tour.slug)! - order.get(b.tour.slug)!;
    }
    if (aFeatured) {
      return -1;
    }
    if (bFeatured) {
      return 1;
    }
    return a.index - b.index;
  });

  return indexed.map(({ tour }) => tour);
}

export function composeStorefrontData(source: StorefrontComposeSource): StorefrontDataDto {
  const storedContent = pickContent(source.content);
  const branding = pickBranding(source.branding);
  const tours = orderFeaturedTours(source.tours, storedContent.featuredTourCodes);

  return {
    config: {
      tenantSlug: source.tenantSlug,
      locale: source.locale,
      themeId: source.themeId,
      branding: {
        name: branding.name ?? source.agencyName,
        logo: branding.logo ?? null,
        ...(branding.tagline ? { tagline: branding.tagline } : {}),
        colors: {},
      },
      navigation: pickNavigation(source.navigation),
      footer: pickFooter(source.footer),
      settings: (source.themeSettings as Record<string, unknown>) ?? {},
    },
    hero: composeHero(storedContent, source.agencyName),
    tours,
    trustPoints: composeTrustPoints(storedContent),
    promotion: composePromotion(storedContent, source.agencyName),
    testimonials: composeTestimonials(storedContent),
    finalCta: composeFinalCta(storedContent, source.agencyName),
    pages: pickCustomPages((source.content as Record<string, unknown>)?.pages, source.isDraft),
  };
}