import type {
  FooterColumnFormValue,
  NavigationRowFormValue,
  WebsiteFormValues,
} from '../schemas/website.schema.ts';
import type { WebsiteContentPatchPayload } from '../types.ts';

/**
 * Form → `PATCH /website/draft/content` body.
 *
 * The backend shallow-merges each key-group into the stored JSON, so every
 * managed key is sent on every save (a missing key would keep its stale
 * value). Section objects are always present; optional strings are sent empty
 * (compose drops them via truthiness) so clearing a field actually clears it.
 * Rows without a required title are dropped rather than stored as blanks.
 *
 * Content and theme keys never mix in this body — `themeId`/`themeSettings`
 * are not part of the form and the backend rejects them anyway (strict body).
 */

const TOUR_CODE_PATTERN = /^TUR-[A-Za-z0-9]+$/;

function trimmed(value: string): string {
  return value.trim();
}

function navigationPayload(rows: NavigationRowFormValue[]): Record<string, unknown>[] {
  return rows
    .map((row) => ({ label: trimmed(row.label), href: trimmed(row.href) }))
    .filter((row) => row.label.length > 0 && row.href.length > 0);
}

function footerColumnPayload(columns: FooterColumnFormValue[]): Record<string, unknown>[] {
  return columns
    .map((column) => ({
      title: trimmed(column.title),
      links: navigationPayload(column.links),
    }))
    .filter((column) => column.title.length > 0);
}

function featuredTourCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const code of codes) {
    const candidate = code.trim();
    if (!TOUR_CODE_PATTERN.test(candidate) || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    unique.push(candidate);
  }
  return unique.slice(0, 30);
}

export function buildWebsiteContentPatch(values: WebsiteFormValues): WebsiteContentPatchPayload {
  const trustPoints = values.trustPoints
    .map((point) => ({
      icon: trimmed(point.icon),
      title: trimmed(point.title),
      text: trimmed(point.text),
    }))
    .filter((point) => point.title.length > 0);

  const testimonials = values.testimonials
    .map((row) => ({
      quote: trimmed(row.quote),
      author: trimmed(row.author),
      location: trimmed(row.location),
    }))
    .filter((row) => row.quote.length > 0);

  return {
    locale: values.locale,
    content: {
      hero: {
        image: trimmed(values.hero.image),
        title: trimmed(values.hero.title),
        subtitle: trimmed(values.hero.subtitle),
      },
      trustPoints,
      promotion: {
        eyebrow: trimmed(values.promotion.eyebrow),
        title: trimmed(values.promotion.title),
        text: trimmed(values.promotion.text),
        ctaLabel: trimmed(values.promotion.ctaLabel),
        ctaHref: trimmed(values.promotion.ctaHref),
      },
      testimonials,
      finalCta: {
        title: trimmed(values.finalCta.title),
        subtitle: trimmed(values.finalCta.subtitle),
        ctaLabel: trimmed(values.finalCta.ctaLabel),
        ctaHref: trimmed(values.finalCta.ctaHref),
      },
      featuredTourCodes: featuredTourCodes(values.featuredTourCodes),
    },
    branding: {
      name: trimmed(values.branding.name),
      tagline: trimmed(values.branding.tagline),
      logo: trimmed(values.branding.logo),
    },
    navigation: navigationPayload(values.navigation),
    footer: {
      description: trimmed(values.footer.description),
      columns: footerColumnPayload(values.footer.columns),
      legal: navigationPayload(values.footer.legal),
    },
  };
}
