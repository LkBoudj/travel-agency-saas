import { describe, expect, test } from 'vitest';
import type { SettingsSchema } from '../types.ts';
import {
  buildActivateThemePatch,
  buildThemePatch,
  buildThemeSettingsPatch,
  groupSettingsFields,
  initialSettingsMap,
} from './settings-map.ts';

const schema: SettingsSchema = {
  fields: [
    { key: 'homepage.showFeaturedTours', type: 'boolean', group: 'homepage', labelKey: 'l1' },
    {
      key: 'layout.theme',
      type: 'select',
      group: 'layout',
      labelKey: 'l2',
      options: [
        { value: 'light', labelKey: 'o1' },
        { value: 'dark', labelKey: 'o2' },
      ],
    },
    { key: 'layout.tagline', type: 'text', group: 'layout', labelKey: 'l3' },
    { key: 'brand.primary', type: 'color', group: 'brand', labelKey: 'l4' },
    {
      key: 'brand.borderRadius',
      type: 'number',
      group: 'brand',
      labelKey: 'l5',
      min: 0,
      max: 24,
      step: 2,
    },
  ],
};

describe('initialSettingsMap', () => {
  test('uses valid stored values per type', () => {
    const values = initialSettingsMap(schema, {
      'homepage.showFeaturedTours': false,
      'layout.theme': 'dark',
      'layout.tagline': 'Go further',
      'brand.primary': '#123abc',
      'brand.borderRadius': 8,
    });
    expect(values).toEqual({
      'homepage.showFeaturedTours': false,
      'layout.theme': 'dark',
      'layout.tagline': 'Go further',
      'brand.primary': '#123abc',
      'brand.borderRadius': 8,
    });
  });

  test('falls back per type when stored value is missing or invalid', () => {
    const values = initialSettingsMap(schema, {
      'homepage.showFeaturedTours': 'yes',
      'layout.theme': 'midnight',
      'brand.primary': 'red',
      'brand.borderRadius': 99,
    });
    expect(values).toEqual({
      'homepage.showFeaturedTours': false,
      'layout.theme': 'light',
      'layout.tagline': '',
      'brand.primary': '#000000',
      'brand.borderRadius': 0,
    });
  });

  test('seeds from nothing with per-type fallbacks', () => {
    const values = initialSettingsMap(schema, undefined);
    expect(values['homepage.showFeaturedTours']).toBe(false);
    expect(values['layout.theme']).toBe('light');
    expect(values['layout.tagline']).toBe('');
    expect(values['brand.primary']).toBe('#000000');
    expect(values['brand.borderRadius']).toBe(0);
  });
});

describe('groupSettingsFields', () => {
  test('groups fields in first-seen order and keeps field order', () => {
    expect(groupSettingsFields(schema)).toEqual([
      { group: 'homepage', fields: [schema.fields[0]] },
      { group: 'layout', fields: [schema.fields[1], schema.fields[2]] },
      { group: 'brand', fields: [schema.fields[3], schema.fields[4]] },
    ]);
  });
});

describe('buildThemeSettingsPatch', () => {
  test('sends only schema-known keys, in schema order, valid values only', () => {
    const patch = buildThemeSettingsPatch(schema, {
      'homepage.showFeaturedTours': true,
      'layout.theme': 'dark',
      'brand.primary': '#0af',
    });
    expect(Object.keys(patch)).toEqual([
      'homepage.showFeaturedTours',
      'layout.theme',
      'brand.primary',
    ]);
  });

  test('drops values invalid for their field', () => {
    const patch = buildThemeSettingsPatch(schema, {
      'layout.theme': 'unknown',
      'brand.primary': 'not-a-color',
      'brand.borderRadius': 50,
      notInSchema: 'ignored',
    });
    expect(patch).toEqual({});
  });
});

describe('buildThemePatch', () => {
  test('produces themeId + themeSettings and nothing else', () => {
    const patch = buildThemePatch('starter', schema, { 'layout.tagline': 'Go further' });
    expect(patch).toEqual({
      themeId: 'starter',
      themeSettings: { 'layout.tagline': 'Go further' },
    });
    expect(patch).not.toHaveProperty('content');
    expect(patch).not.toHaveProperty('branding');
    expect(patch).not.toHaveProperty('navigation');
    expect(patch).not.toHaveProperty('footer');
    expect(patch).not.toHaveProperty('locale');
  });
});

describe('buildActivateThemePatch', () => {
  test('sends themeId alone, leaving settings untouched', () => {
    expect(buildActivateThemePatch('starter')).toEqual({ themeId: 'starter' });
  });
});
