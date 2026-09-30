import { describe, expect, it } from 'vitest';
import { websiteToFormValues } from '../lib/website-defaults.ts';
import type { WebsiteDraftResponse } from '../types.ts';
import { websiteFormSchema } from './website.schema.ts';

/**
 * `ensureDraft` stores an empty aggregate (`content: {}`, `branding: {}`,
 * `footer: {}`, `navigation: []`) and the public composer falls back to the
 * agency name, so a never-edited draft must pass the editor schema — otherwise
 * Save is rejected for a brand-new agency and the write path is dead.
 */
const freshDraft: WebsiteDraftResponse = {
  slug: 'agy-fresh',
  locale: 'en',
  themeId: null,
  themeSettings: {},
  content: {},
  branding: {},
  navigation: [],
  footer: {},
  publishedAt: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('websiteFormSchema', () => {
  it('accepts a brand-new empty draft', () => {
    const result = websiteFormSchema.safeParse(websiteToFormValues(freshDraft));

    expect(result.success).toBe(true);
  });

  it('still rejects a headline beyond the storefront limit', () => {
    const values = websiteToFormValues(freshDraft);

    const result = websiteFormSchema.safeParse({
      ...values,
      hero: { ...values.hero, title: 'x'.repeat(121) },
    });

    expect(result.success).toBe(false);
  });

  it('still rejects a blank navigation row, which would render a broken link', () => {
    const values = websiteToFormValues(freshDraft);

    const result = websiteFormSchema.safeParse({
      ...values,
      navigation: [{ label: '', href: '' }],
    });

    expect(result.success).toBe(false);
  });
});
