import type {
  FooterColumnFormValue,
  NavigationRowFormValue,
  WebsiteFormValues,
} from '../schemas/website.schema.ts';
import type { WebsiteAggregate } from '../types.ts';

/**
 * Maps the free-form stored aggregate JSON into typed form values for the
 * Website editor. Reads are defensive (the backend treats these columns as
 * untyped JSON) and mirror the backend's compose pickers: unknown or
 * malformed entries are dropped, known string fields default to `''`.
 *
 * Note: the backend also stores `branding.about`/`branding.contact` and
 * `promotion.image`, but the storefront compose boundary does not render
 * them, so the editor does not manage them — saves leave stored values alone
 * (the merge keeps unknown keys).
 */

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          entry !== null && typeof entry === 'object' && !Array.isArray(entry)
      )
    : [];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toNavigationRow(value: Record<string, unknown>): NavigationRowFormValue {
  return { label: asString(value.label), href: asString(value.href) };
}

function toFooterColumn(value: Record<string, unknown>): FooterColumnFormValue {
  return {
    title: asString(value.title),
    links: asRecordArray(value.links).map(toNavigationRow),
  };
}

export function emptyWebsiteFormValues(): WebsiteFormValues {
  return {
    locale: 'en',
    hero: { title: '', subtitle: '', image: '' },
    trustPoints: [],
    promotion: { eyebrow: '', title: '', text: '', ctaLabel: '', ctaHref: '' },
    testimonials: [],
    finalCta: { title: '', subtitle: '', ctaLabel: '', ctaHref: '' },
    featuredTourCodes: [],
    branding: { name: '', tagline: '', logo: '' },
    navigation: [],
    footer: { description: '', columns: [], legal: [] },
  };
}

export function websiteToFormValues(website: WebsiteAggregate): WebsiteFormValues {
  const content = asRecord(website.content);
  const branding = asRecord(website.branding);
  const footer = asRecord(website.footer);

  const hero = asRecord(content?.hero);
  const promotion = asRecord(content?.promotion);
  const finalCta = asRecord(content?.finalCta);

  const asTestimonial = (value: Record<string, unknown>) => ({
    quote: asString(value.quote),
    author: asString(value.author),
    location: asString(value.location),
  });
  const asTrustPoint = (value: Record<string, unknown>) => ({
    icon: asString(value.icon),
    title: asString(value.title),
    text: asString(value.text),
  });

  return {
    locale: website.locale === 'ar' ? 'ar' : 'en',
    hero: {
      title: asString(hero?.title),
      subtitle: asString(hero?.subtitle),
      image: asString(hero?.image),
    },
    trustPoints: asRecordArray(content?.trustPoints).map(asTrustPoint),
    promotion: {
      eyebrow: asString(promotion?.eyebrow),
      title: asString(promotion?.title),
      text: asString(promotion?.text),
      ctaLabel: asString(promotion?.ctaLabel),
      ctaHref: asString(promotion?.ctaHref),
    },
    testimonials: asRecordArray(content?.testimonials).map(asTestimonial),
    finalCta: {
      title: asString(finalCta?.title),
      subtitle: asString(finalCta?.subtitle),
      ctaLabel: asString(finalCta?.ctaLabel),
      ctaHref: asString(finalCta?.ctaHref),
    },
    featuredTourCodes: asStringArray(content?.featuredTourCodes),
    branding: {
      name: asString(branding?.name),
      tagline: asString(branding?.tagline),
      logo: asString(branding?.logo),
    },
    navigation: Array.isArray(website.navigation)
      ? asRecordArray(website.navigation).map(toNavigationRow)
      : [],
    footer: {
      description: asString(footer?.description),
      columns: asRecordArray(footer?.columns).map(toFooterColumn),
      legal: asRecordArray(footer?.legal).map(toNavigationRow),
    },
  };
}
