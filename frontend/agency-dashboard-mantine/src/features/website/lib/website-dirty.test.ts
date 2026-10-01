import { describe, expect, test } from 'vitest';
import type { WebsiteFormValues } from '../schemas/website.schema.ts';
import { isWebsiteFormDirty } from './website-dirty.ts';

/**
 * The dirty indicator is only useful if it is honest. Two lies are possible:
 * calling a clean form dirty (the member saves a no-op and wonders what they
 * did wrong), and calling a changed form clean (they leave, lose the edit, and
 * find out later). Both are worse than having no indicator at all.
 */

function values(overrides: Partial<WebsiteFormValues> = {}): WebsiteFormValues {
  return {
    locale: 'en',
    hero: { title: 'Sahara by night', subtitle: '', image: '' },
    trustPoints: [{ icon: 'star', title: 'Local guides', text: 'Twelve years in the M’zab.' }],
    promotion: { eyebrow: '', title: '', text: '', ctaLabel: '', ctaHref: '' },
    testimonials: [],
    finalCta: { title: '', subtitle: '', ctaLabel: '', ctaHref: '' },
    featuredTourCodes: ['TUR-1'],
    branding: { name: 'Nomad', tagline: '', logo: '' },
    navigation: [{ label: 'Tours', href: '/tours' }],
    footer: {
      description: '',
      columns: [{ title: 'Explore', links: [{ label: 'Tours', href: '/tours' }] }],
      legal: [],
    },
    ...overrides,
  };
}

describe('isWebsiteFormDirty', () => {
  test('an untouched form is clean', () => {
    const baseline = values();

    expect(isWebsiteFormDirty({ ...baseline }, baseline)).toBe(false);
  });

  test('an edited field is dirty', () => {
    const baseline = values();

    expect(
      isWebsiteFormDirty({ ...baseline, hero: { ...baseline.hero, title: 'Desert' } }, baseline)
    ).toBe(true);
  });

  test('a deep field is dirty, not just a top-level key', () => {
    const baseline = values();

    expect(
      isWebsiteFormDirty(
        { ...baseline, footer: { ...baseline.footer, description: 'Since 2014.' } },
        baseline
      )
    ).toBe(true);
  });

  test('whitespace the payload trims anyway is not a change worth saving', () => {
    const baseline = values();

    // The schema trims on parse and the payload trims again, so typing a space
    // saves nothing. Reporting that as dirty would train the member to ignore
    // the indicator.
    expect(
      isWebsiteFormDirty(
        { ...baseline, hero: { ...baseline.hero, title: 'Desert ' } },
        {
          ...baseline,
          hero: { ...baseline.hero, title: 'Desert' },
        }
      )
    ).toBe(false);
  });

  test('an added list row is dirty', () => {
    const baseline = values();

    expect(
      isWebsiteFormDirty(
        { ...baseline, testimonials: [{ quote: 'Unforgettable.', author: 'Amina', location: '' }] },
        baseline
      )
    ).toBe(true);
  });

  test('a removed list row is dirty', () => {
    const baseline = values();

    expect(isWebsiteFormDirty({ ...baseline, trustPoints: [] }, baseline)).toBe(true);
  });

  test('reordered list rows are dirty, because order is what ships', () => {
    const baseline = values({
      navigation: [
        { label: 'Tours', href: '/tours' },
        { label: 'Contact', href: '/contact' },
      ],
    });
    const reordered = {
      ...baseline,
      navigation: [baseline.navigation[1], baseline.navigation[0]],
    };

    expect(isWebsiteFormDirty(reordered, baseline)).toBe(true);
  });

  test('a nested list row added under a footer column is dirty', () => {
    const baseline = values();

    expect(
      isWebsiteFormDirty(
        {
          ...baseline,
          footer: {
            ...baseline.footer,
            columns: [
              {
                title: 'Explore',
                links: [
                  { label: 'Tours', href: '/tours' },
                  { label: 'Contact', href: '/contact' },
                ],
              },
            ],
          },
        },
        baseline
      )
    ).toBe(true);
  });

  test('switching the locale is dirty, even though it is not a text field', () => {
    const baseline = values();

    expect(isWebsiteFormDirty({ ...baseline, locale: 'ar' }, baseline)).toBe(true);
  });

  test('the same content in a different key order is clean', () => {
    const baseline = values();
    const reordered = {
      branding: { ...baseline.branding },
      hero: { ...baseline.hero },
      locale: 'en',
      finalCta: { ...baseline.finalCta },
      testimonials: [...baseline.testimonials],
      trustPoints: [...baseline.trustPoints],
      promotion: { ...baseline.promotion },
      featuredTourCodes: [...baseline.featuredTourCodes],
      navigation: [...baseline.navigation],
      footer: {
        legal: [...baseline.footer.legal],
        description: '',
        columns: [{ title: 'Explore', links: [{ label: 'Tours', href: '/tours' }] }],
      },
    } as unknown as WebsiteFormValues;

    // A form value object is rebuilt on every keystroke; key order must not be
    // mistaken for an edit.
    expect(isWebsiteFormDirty(reordered, baseline)).toBe(false);
  });
});
