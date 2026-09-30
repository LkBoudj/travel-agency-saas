import { describe, expect, test } from 'vitest';
import { parseThemesManifest } from './themes-manifest.api.ts';

const VALID_MANIFEST = {
  themes: [
    {
      themeId: 'starter',
      nameKey: 'themes.starter.name',
      descriptionKey: 'themes.starter.description',
      version: '1.0.0',
      previewImage: '/preview/starter.png',
      settingsSchema: {
        fields: [
          {
            key: 'homepage.showFeaturedTours',
            type: 'boolean',
            group: 'homepage',
            labelKey: 'settings.starter.homepage.showFeaturedTours',
          },
          {
            key: 'layout.theme',
            type: 'select',
            group: 'layout',
            labelKey: 'settings.starter.layout.theme',
            options: [
              { value: 'light', labelKey: 'settings.starter.layout.theme.light' },
              { value: 'dark', labelKey: 'settings.starter.layout.theme.dark' },
            ],
          },
          {
            key: 'brand.borderRadius',
            type: 'number',
            group: 'brand',
            labelKey: 'settings.starter.brand.borderRadius',
            min: 0,
            max: 24,
            step: 2,
          },
        ],
      },
    },
  ],
};

describe('parseThemesManifest', () => {
  test('parses a valid manifest and passes through numbers/options', () => {
    const parsed = parseThemesManifest(VALID_MANIFEST);
    expect(parsed.themes).toHaveLength(1);
    const [theme] = parsed.themes;
    expect(theme.themeId).toBe('starter');
    expect(theme.previewImage).toBe('/preview/starter.png');
    expect(theme.settingsSchema.fields).toHaveLength(3);
    const radius = theme.settingsSchema.fields.find((f) => f.key === 'brand.borderRadius');
    expect(radius).toMatchObject({ type: 'number', min: 0, max: 24, step: 2 });
  });

  test('omits previewImage when absent', () => {
    const manifest = { themes: [{ ...VALID_MANIFEST.themes[0], previewImage: undefined }] };
    const [theme] = parseThemesManifest(manifest).themes;
    expect(theme).not.toHaveProperty('previewImage');
  });

  test('rejects a non-object body', () => {
    expect(() => parseThemesManifest(null)).toThrow(/themes/);
    expect(() => parseThemesManifest({})).toThrow(/themes/);
    expect(() => parseThemesManifest([])).toThrow(/themes/);
  });

  test('rejects a theme missing required manifest fields', () => {
    const { themeId: _drop, ...rest } = VALID_MANIFEST.themes[0];
    void _drop;
    expect(() => parseThemesManifest({ themes: [rest] })).toThrow(/required fields/);
  });

  test('rejects an unknown settings field type', () => {
    const broken = structuredClone(VALID_MANIFEST);
    (broken.themes[0].settingsSchema.fields[0] as { type: string }).type = 'textarea';
    expect(() => parseThemesManifest(broken)).toThrow(/malformed/);
  });

  test('rejects a select option without value or labelKey', () => {
    const broken = structuredClone(VALID_MANIFEST);
    const select = broken.themes[0].settingsSchema.fields.find(
      (field: { key: string }) => field.key === 'layout.theme'
    ) as { options: Array<{ value: string; labelKey?: string }> };
    select.options[1] = { value: 'dark' };
    expect(() => parseThemesManifest(broken)).toThrow(/option/);
  });
});
