import { describe, expect, test } from 'vitest';
import i18n from './index.ts';

/**
 * Every key must exist in both catalogs.
 *
 * i18next falls back to the English string — or worse, to the raw key — the first
 * time a translator missed one, which reads as an English sentence on an Arabic
 * page. This is the cheapest guard there is for the two-locale requirement, and
 * it covers the plural families as one key.
 */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function withoutPluralSuffix(key: string): string {
  return key.replace(/_(zero|one|two|few|many|other)$/, '');
}

const bundle = (locale: 'en' | 'ar') => i18n.options.resources?.[locale] ?? {};
const keySet = (locale: 'en' | 'ar', namespace: string) =>
  new Set(
    keyPaths(bundle(locale)[namespace])
      .map(withoutPluralSuffix)
      .filter((key) => !key.endsWith('.value'))
  );

describe('en/ar catalogs', () => {
  test('cover the same namespaces', () => {
    expect(Object.keys(bundle('en')).sort()).toEqual(Object.keys(bundle('ar')).sort());
  });

  for (const namespace of Object.keys(bundle('en'))) {
    test(`${namespace} has no key missing from the other locale`, () => {
      const en = keySet('en', namespace);
      const ar = keySet('ar', namespace);

      expect([...en].filter((key) => !ar.has(key)).sort()).toEqual([]);
      expect([...ar].filter((key) => !en.has(key)).sort()).toEqual([]);
    });
  }
});

describe('counted copy renders real plurals', () => {
  // The `_plural` suffix is not a thing in i18next v21+: `Intl.PluralRules`
  // looks for `_one`/`_other` (and the full ar family). With only a `_plural`
  // key, every count fell back to the singular base string — "3 seat".
  const cases: [string, string, Record<number, string>][] = [
    ['pricing', 'summary.optionsCount', { 1: '1 option', 3: '3 options' }],
    [
      'pricing',
      'summary.pricedDepartures',
      { 1: '1 priced open departure', 3: '3 priced open departures' },
    ],
    ['bookings', 'details.seatCount', { 1: '1 seat', 3: '3 seats' }],
    ['departures', 'departuresCount', { 1: '1 departure', 3: '3 departures' }],
    ['trips', 'duration.days', { 1: '1 day', 3: '3 days' }],
    ['trips', 'duration.hours', { 1: '1 hour', 3: '3 hours' }],
  ];

  for (const [namespace, key, expected] of cases) {
    test(`en ${namespace}.${key}`, () => {
      const t = i18n.getFixedT('en', namespace);
      for (const [count, text] of Object.entries(expected)) {
        expect(t(key, { count: Number(count) })).toBe(text);
      }
    });
  }

  test('ar pricing.summary.optionsCount', () => {
    const t = i18n.getFixedT('ar', 'pricing');
    expect(t('summary.optionsCount', { count: 1 })).toBe('خيار واحد');
    expect(t('summary.optionsCount', { count: 3 })).toBe('3 خيارات');
  });

  test('ar bookings.details.seatCount', () => {
    const t = i18n.getFixedT('ar', 'bookings');
    expect(t('details.seatCount', { count: 1 })).toBe('مقعد واحد');
    expect(t('details.seatCount', { count: 3 })).toBe('3 مقاعد');
  });
});
