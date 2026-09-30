import { describe, expect, it } from 'vitest';
import { firstWebsiteTabWithErrors } from './website-validation.ts';

describe('firstWebsiteTabWithErrors', () => {
  it('returns the tab that owns the failing field', () => {
    expect(firstWebsiteTabWithErrors({ hero: { title: 'too long' } })).toBe('home');
    expect(firstWebsiteTabWithErrors({ featuredTourCodes: 'bad' })).toBe('tours');
    expect(firstWebsiteTabWithErrors({ navigation: 'bad' })).toBe('navigation');
    expect(firstWebsiteTabWithErrors({ footer: 'bad' })).toBe('footer');
    expect(firstWebsiteTabWithErrors({ branding: 'bad' })).toBe('branding');
  });

  it('prefers the earliest tab when several fail', () => {
    expect(firstWebsiteTabWithErrors({ branding: 'bad', hero: 'bad' })).toBe('home');
  });

  it('returns null for keys that are not form fields', () => {
    expect(firstWebsiteTabWithErrors({})).toBeNull();
    expect(firstWebsiteTabWithErrors({ somethingElse: 'bad' })).toBeNull();
  });
});
