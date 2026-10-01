import { afterEach, describe, expect, test, vi } from 'vitest';
import type { MantineThemeComponents } from '@mantine/core';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.resetModules();
});

/**
 * `componentDefaults` is a module-level constant, so it reads the media query
 * once when the theme is imported. Re-importing it behind a mocked
 * `matchMedia` is the only honest way to assert what the app would build under
 * each setting.
 */
async function defaultsWithReducedMotion(matches: boolean): Promise<MantineThemeComponents> {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.resetModules();
  const { componentDefaults } = await import('./component-defaults');
  return componentDefaults;
}

/**
 * The overlays animate by default. Someone who asked their OS to reduce motion
 * must not get a slide on every dialog open, so Modal and Drawer lose their
 * transition when the media query matches.
 */
describe('overlay transitions', () => {
  test('animate when motion is allowed', async () => {
    const defaults = await defaultsWithReducedMotion(false);
    expect(defaults.Modal?.defaultProps?.transitionProps).toMatchObject({ duration: 150 });
    expect(defaults.Drawer?.defaultProps?.transitionProps).toMatchObject({ duration: 150 });
  });

  test('stop animating when the user asked for reduced motion', async () => {
    const defaults = await defaultsWithReducedMotion(true);
    expect(defaults.Modal?.defaultProps?.transitionProps).toMatchObject({ duration: 0 });
    expect(defaults.Drawer?.defaultProps?.transitionProps).toMatchObject({ duration: 0 });
  });
});
