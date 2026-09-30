import { describe, expect, test } from 'vitest';
import { splitQualifiedKey, translateQualifiedKey } from './qualified-keys.ts';

describe('splitQualifiedKey', () => {
  test('splits a namespace from the path', () => {
    expect(splitQualifiedKey('themes.starter.name')).toEqual({
      namespace: 'themes',
      path: 'starter.name',
    });
  });

  test('trims surrounding whitespace', () => {
    expect(splitQualifiedKey('  pricing.basis.per_person  ')).toEqual({
      namespace: 'pricing',
      path: 'basis.per_person',
    });
  });

  test('rejects keys without a namespace or without a path', () => {
    for (const key of ['starterName', '', '.', 'themes.', '.starter', '   ']) {
      expect(splitQualifiedKey(key)).toBeNull();
    }
  });

  test('rejects malformed namespaces and empty path segments', () => {
    for (const key of [
      'Themes.starter',
      'the-mes.starter',
      'the mes.starter',
      'themes..name',
      'themes.starter..name',
      'themes.star ter',
    ]) {
      expect(splitQualifiedKey(key)).toBeNull();
    }
  });

  test('rejects a key with a URL-ish or templated shape', () => {
    for (const key of ['https://example.com/a', 'themes.starter.name/x', 'themes.{{name}}']) {
      expect(splitQualifiedKey(key)).toBeNull();
    }
  });
});

describe('translateQualifiedKey', () => {
  // `settings` is deliberately absent: a theme's settings labels live in a
  // namespace that may not be loaded.
  const catalog: Record<string, Record<string, string>> = {
    themes: { 'starter.name': 'Starter', 'starter.description': 'A clean single-theme starter.' },
    pricing: { 'basis.per_person': 'Per person', 'basis.per_booking': 'Per booking' },
  };

  const translate = (namespace: string, path: string) => catalog[namespace]?.[path];

  test('translates a known key', () => {
    expect(translateQualifiedKey('themes.starter.name', translate)).toBe('Starter');
    expect(translateQualifiedKey('pricing.basis.per_booking', translate)).toBe('Per booking');
  });

  test('falls back to the raw key for an unknown path in a known namespace', () => {
    expect(translateQualifiedKey('themes.mystery.name', translate)).toBe('themes.mystery.name');
  });

  test('falls back to the raw key for an unloaded namespace', () => {
    expect(translateQualifiedKey('settings.starter.homepage.showWhyUs', translate)).toBe(
      'settings.starter.homepage.showWhyUs'
    );
  });

  test('falls back to the raw key for a malformed key', () => {
    expect(translateQualifiedKey('starterName', translate)).toBe('starterName');
  });

  test('treats an empty translation and an echo of the path as missing', () => {
    expect(translateQualifiedKey('themes.starter.name', () => '')).toBe('themes.starter.name');
    expect(translateQualifiedKey('themes.starter.name', (_ns, path) => path)).toBe(
      'themes.starter.name'
    );
  });

  test('falls back to the raw key when the translator throws', () => {
    expect(
      translateQualifiedKey('themes.starter.name', () => {
        throw new Error('namespace not loaded');
      })
    ).toBe('themes.starter.name');
  });

  test('passes an Arabic value through untouched (RTL-safe)', () => {
    const ar: Record<string, Record<string, string>> = {
      themes: { 'starter.name': 'الأساسية' },
      settings: { 'starter.homepage.showWhyUs': 'إظهار قسم «لماذا نحن»' },
    };
    const translateAr = (namespace: string, path: string) => ar[namespace]?.[path];
    expect(translateQualifiedKey('themes.starter.name', translateAr)).toBe('الأساسية');
    expect(translateQualifiedKey('settings.starter.homepage.showWhyUs', translateAr)).toBe(
      'إظهار قسم «لماذا نحن»'
    );
  });

  test("passes a value with a placeholder through verbatim (interpolation is the caller's)", () => {
    const withPlaceholder: QualifiedTranslator = (namespace, path) =>
      catalog[namespace]?.[path] ?? `{{${path.split('.').pop()}}}`;
    expect(translateQualifiedKey('themes.starter.tagline', withPlaceholder)).toBe('{{tagline}}');
  });
});

type QualifiedTranslator = Parameters<typeof translateQualifiedKey>[1];
