import { describe, expect, test } from 'vitest';
import type { WebsiteFormValues } from '../schemas/website.schema.ts';
import { buildWebsiteContentPatch } from './website-payloads.ts';

/** Shaped view of the payload the API returns (loosely typed as records). */
interface ShapedPatchPayload {
  locale?: string;
  content?: {
    hero: { image: string; title: string; subtitle: string };
    trustPoints: Array<{ icon: string; title: string; text: string }>;
    promotion: {
      eyebrow: string;
      title: string;
      text: string;
      ctaLabel: string;
      ctaHref: string;
    };
    testimonials: Array<{ quote: string; author: string; location: string }>;
    finalCta: { title: string; subtitle: string; ctaLabel: string; ctaHref: string };
    featuredTourCodes: string[];
  };
  branding: { name: string; tagline: string; logo: string };
  navigation: Array<{ label: string; href: string }>;
  footer: {
    description: string;
    columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
    legal: Array<{ label: string; href: string }>;
  };
}

function build(values: WebsiteFormValues): ShapedPatchPayload {
  return buildWebsiteContentPatch(values) as unknown as ShapedPatchPayload;
}

function emptyFormValues(): WebsiteFormValues {
  return {
    locale: 'en',
    hero: { image: '', title: '', subtitle: '' },
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

describe('buildWebsiteContentPatch', () => {
  test('returns every managed key group even when empty', () => {
    const payload = build(emptyFormValues());
    expect(payload).toEqual({
      locale: 'en',
      content: {
        hero: { image: '', title: '', subtitle: '' },
        trustPoints: [],
        promotion: { eyebrow: '', title: '', text: '', ctaLabel: '', ctaHref: '' },
        testimonials: [],
        finalCta: { title: '', subtitle: '', ctaLabel: '', ctaHref: '' },
        featuredTourCodes: [],
      },
      branding: { name: '', tagline: '', logo: '' },
      navigation: [],
      footer: { description: '', columns: [], legal: [] },
    });
  });

  test('does not mix theme keys into the content body', () => {
    const raw = buildWebsiteContentPatch(emptyFormValues());
    expect(raw).not.toHaveProperty('themeId');
    expect(raw).not.toHaveProperty('themeSettings');
    expect(raw.content).not.toHaveProperty('themeId');
  });

  test('trims all strings', () => {
    const values = emptyFormValues();
    values.hero.title = '  Wander Morocco  ';
    values.hero.subtitle = '  Guided adventures  ';
    const payload = build(values);
    expect(payload.content?.hero.title).toBe('Wander Morocco');
    expect(payload.content?.hero.subtitle).toBe('Guided adventures');
  });

  test('drops trust points without a title and trims the rest', () => {
    const values = emptyFormValues();
    values.trustPoints = [
      { icon: '  shield  ', title: '  Certified  ', text: '  Licensed guides  ' },
      { icon: 'flag', title: '', text: 'no title' },
      { icon: '', title: '  ', text: '' },
    ];
    const payload = build(values);
    expect(payload.content?.trustPoints).toEqual([
      { icon: 'shield', title: 'Certified', text: 'Licensed guides' },
    ]);
  });

  test('drops testimonials without a quote', () => {
    const values = emptyFormValues();
    values.testimonials = [
      { quote: '  Amazing!  ', author: '  Sara  ', location: ' Casablanca ' },
      { quote: '', author: 'Naima', location: '' },
    ];
    const payload = build(values);
    expect(payload.content?.testimonials).toEqual([
      { quote: 'Amazing!', author: 'Sara', location: 'Casablanca' },
    ]);
  });

  test('deduplicates, validates and caps featured tour codes at 30', () => {
    const values = emptyFormValues();
    const valid = Array.from({ length: 32 }, (_, index) => `TUR-C${index}`.toUpperCase());
    values.featuredTourCodes = [' TUR-B9 ', ...valid, 'TUR-C0', 'TUR-BAD!', 'not-a-code'];
    const payload = build(values);
    const codes = payload.content?.featuredTourCodes ?? [];
    expect(codes).toHaveLength(30);
    expect(codes[0]).toBe('TUR-B9');
    expect(codes).toContain('TUR-C0');
    expect(codes).not.toContain('TUR-BAD!');
    expect(codes).not.toContain('not-a-code');
    expect(codes).not.toContain('TUR-C31');
  });

  test('drops navigation rows missing label or href', () => {
    const values = emptyFormValues();
    values.navigation = [
      { label: '  Trips  ', href: '  /trips  ' },
      { label: 'Empty href', href: '' },
      { label: '', href: '/mystery' },
    ];
    const payload = build(values);
    expect(payload.navigation).toEqual([{ label: 'Trips', href: '/trips' }]);
  });

  test('drops footer columns without a title and keeps their links', () => {
    const values = emptyFormValues();
    values.footer.columns = [
      {
        title: '  Explore  ',
        links: [
          { label: '  Itineraries  ', href: '/itineraries' },
          { label: '', href: '/missing-label' },
        ],
      },
      { title: '', links: [{ label: 'Orphan', href: '/orphan' }] },
    ];
    const payload = build(values);
    expect(payload.footer?.columns).toEqual([
      {
        title: 'Explore',
        links: [{ label: 'Itineraries', href: '/itineraries' }],
      },
    ]);
  });

  test('keeps only non-empty legal links', () => {
    const values = emptyFormValues();
    values.footer.legal = [
      { label: '  Privacy  ', href: '  /privacy  ' },
      { label: '', href: '' },
    ];
    const payload = build(values);
    expect(payload.footer?.legal).toEqual([{ label: 'Privacy', href: '/privacy' }]);
  });
});
