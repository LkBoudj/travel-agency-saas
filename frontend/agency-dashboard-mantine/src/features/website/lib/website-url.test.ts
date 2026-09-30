import { describe, expect, test } from 'vitest';
import { storefrontServesAnotherTenant, websitePublicUrl } from './website-url.ts';

describe('websitePublicUrl', () => {
  test('builds the platform tenant URL from slug + platform domain', () => {
    expect(websitePublicUrl({ slug: 'agy-0c937b377b89', platformDomain: 'example.com' })).toBe(
      'https://agy-0c937b377b89.example.com/'
    );
  });

  test('a custom domain wins over the platform domain', () => {
    expect(
      websitePublicUrl({
        slug: 'agy-0c937b377b89',
        platformDomain: 'example.com',
        customDomain: 'hichem-traveling.dz',
      })
    ).toBe('https://hichem-traveling.dz/');
  });

  test('a custom domain does not need a slug', () => {
    expect(websitePublicUrl({ slug: null, customDomain: 'hichem-traveling.dz' })).toBe(
      'https://hichem-traveling.dz/'
    );
  });

  test('the dev storefront origin is used as-is (single-tenant server)', () => {
    expect(
      websitePublicUrl({
        slug: 'agy-0c937b377b89',
        platformDomain: 'example.com',
        storefrontBaseUrl: 'http://localhost:4321',
      })
    ).toBe('http://localhost:4321/');
  });

  test('trims a trailing slash on the storefront origin', () => {
    expect(
      websitePublicUrl({ slug: 'agy-0c937b377b89', storefrontBaseUrl: 'http://localhost:4321/' })
    ).toBe('http://localhost:4321/');
  });

  test('normalizes case on the slug and the domain', () => {
    expect(websitePublicUrl({ slug: ' AGY-0C937B377B89 ', platformDomain: 'Example.COM' })).toBe(
      'https://agy-0c937b377b89.example.com/'
    );
  });

  test('returns null without a slug (no invented address)', () => {
    expect(websitePublicUrl({ slug: null, platformDomain: 'example.com' })).toBeNull();
    expect(websitePublicUrl({ slug: '', platformDomain: 'example.com' })).toBeNull();
    expect(
      websitePublicUrl({ slug: undefined, storefrontBaseUrl: 'http://localhost:4321' })
    ).toBeNull();
  });

  test('returns null for a malformed slug', () => {
    for (const slug of [
      'agy--0c937b',
      'AGY_0C937B',
      'agy 0c937b',
      'https://agy.example.com',
      '-agy',
      'agy-',
      'a/b',
      'x'.repeat(64),
    ]) {
      expect(websitePublicUrl({ slug, platformDomain: 'example.com' })).toBeNull();
    }
  });

  test('returns null for a malformed domain or custom domain', () => {
    expect(websitePublicUrl({ slug: 'agy-1', platformDomain: 'not a domain' })).toBeNull();
    expect(websitePublicUrl({ slug: 'agy-1', platformDomain: 'https://example.com' })).toBeNull();
    expect(websitePublicUrl({ slug: 'agy-1', customDomain: 'bad_domain.dz' })).toBeNull();
    expect(websitePublicUrl({ slug: 'agy-1', customDomain: 'hichem..traveling.dz' })).toBeNull();
  });

  test('returns null when nothing is configured', () => {
    expect(websitePublicUrl({ slug: 'agy-0c937b377b89' })).toBeNull();
    expect(websitePublicUrl({ slug: 'agy-0c937b377b89', platformDomain: '  ' })).toBeNull();
  });
});

describe('storefrontServesAnotherTenant', () => {
  test('flags a dev storefront pointed at another agency', () => {
    expect(
      storefrontServesAnotherTenant({
        slug: 'agy-0c937b377b89',
        storefrontTenantSlug: 'agy-other',
        isDev: true,
      })
    ).toBe(true);
  });

  test('is false when the dev storefront serves this agency', () => {
    expect(
      storefrontServesAnotherTenant({
        slug: 'agy-0c937b377b89',
        storefrontTenantSlug: 'AGY-0C937B377B89',
        isDev: true,
      })
    ).toBe(false);
  });

  test('is false in production and when the dev tenant is unknown', () => {
    expect(
      storefrontServesAnotherTenant({
        slug: 'agy-0c937b377b89',
        storefrontTenantSlug: 'agy-other',
        isDev: false,
      })
    ).toBe(false);
    expect(storefrontServesAnotherTenant({ slug: 'agy-0c937b377b89', isDev: true })).toBe(false);
    expect(
      storefrontServesAnotherTenant({ slug: null, storefrontTenantSlug: 'agy-other', isDev: true })
    ).toBe(false);
  });
});
