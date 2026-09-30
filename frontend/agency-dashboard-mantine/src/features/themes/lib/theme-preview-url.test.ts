import { describe, expect, test } from 'vitest';
import { themePreviewUrl } from './theme-preview-url.ts';

const BASE = 'http://localhost:4321';

describe('themePreviewUrl', () => {
  test('resolves a root-relative manifest path against the themes base URL', () => {
    expect(themePreviewUrl('/demo/themes/starter-home.jpg', BASE)).toBe(
      'http://localhost:4321/demo/themes/starter-home.jpg'
    );
  });

  test('normalizes a trailing slash on the base URL', () => {
    expect(themePreviewUrl('/demo/themes/starter-home.jpg', 'https://themes.example.com///')).toBe(
      'https://themes.example.com/demo/themes/starter-home.jpg'
    );
  });

  test('adds the leading slash for a relative path', () => {
    expect(themePreviewUrl('demo/themes/starter-home.jpg', BASE)).toBe(
      'http://localhost:4321/demo/themes/starter-home.jpg'
    );
  });

  test('passes an absolute URL through untouched', () => {
    expect(themePreviewUrl('https://cdn.example.com/preview.jpg', BASE)).toBe(
      'https://cdn.example.com/preview.jpg'
    );
    expect(themePreviewUrl('http://cdn.example.com/preview.jpg', BASE)).toBe(
      'http://cdn.example.com/preview.jpg'
    );
  });

  test('returns null for a missing or blank image', () => {
    expect(themePreviewUrl(undefined, BASE)).toBeNull();
    expect(themePreviewUrl('', BASE)).toBeNull();
    expect(themePreviewUrl('   ', BASE)).toBeNull();
  });

  test('returns null without a base URL rather than guessing the dashboard origin', () => {
    expect(themePreviewUrl('/demo/themes/starter-home.jpg', undefined)).toBeNull();
    expect(themePreviewUrl('/demo/themes/starter-home.jpg', '  ')).toBeNull();
  });
});
