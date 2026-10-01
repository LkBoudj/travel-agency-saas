import { describe, expect, test } from 'vitest';
import {
  DEFAULT_THEME,
  mergeMantineTheme,
  type MantineColorScheme,
  type MantineTheme,
} from '@mantine/core';
import { colors, STATUS_COLORS } from './colors.ts';
import { cssVariablesResolver, DIMMED_LIGHT, theme } from './theme.ts';

/**
 * WCAG 2.1 AA contrast, measured rather than eyeballed.
 *
 * Decision D1 moved the app from a forced dark scheme to light surfaces, and the
 * neutral surfaces are not white: the page is `gray-0` and sunken table headers
 * are `gray-1`. A colour that passes on white can still fail on those, so every
 * text/background pair the product actually renders is pinned here at 4.5:1.
 */

type Rgb = readonly [number, number, number];

function hex(value: string): Rgb {
  const digits = value.replace('#', '');
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ] as const;
}

function luminance(value: string): number {
  const [r, g, b] = hex(value).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const AA_TEXT = 4.5;
const WHITE = '#FFFFFF';
const MANTINE_TEXT = '#000000';

const gray = colors.gray;

/**
 * The theme as `MantineProvider` hands it to the CSS-variable resolver: Mantine
 * defaults merged under the app theme, with the active scheme applied.
 */
function mergedTheme(colorScheme: MantineColorScheme): MantineTheme {
  return { ...mergeMantineTheme(DEFAULT_THEME, theme), colorScheme } as MantineTheme;
}

describe('secondary text on the surfaces the app renders', () => {
  // Mantine's light `dimmed` is `gray-6`: 4.51:1 on white, but 4.31:1 on the
  // gray-0 page and 4.08:1 on the gray-1 sunken table header. The theme moves
  // `dimmed` one step darker for the light scheme; these are the measured pairs
  // that decision is accountable for.
  test("Mantine default dimmed would fail on the app's own surfaces", () => {
    expect(contrast(gray[6], gray[0])).toBeLessThan(AA_TEXT);
    expect(contrast(gray[6], gray[1])).toBeLessThan(AA_TEXT);
  });

  test.each([
    ['white card', WHITE],
    ['page surface', gray[0]],
    ['sunken table header', gray[1]],
  ])('%s', (_label, background) => {
    expect(contrast(gray[7], background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  test('the light scheme resolves dimmed to gray-7', () => {
    const resolved = cssVariablesResolver(mergedTheme('light'));
    expect(resolved.light['--mantine-color-dimmed']).toBe(DIMMED_LIGHT);
  });

  test('the dark scheme keeps Mantine default dimmed', () => {
    const resolved = cssVariablesResolver(mergedTheme('dark'));
    expect(resolved.dark['--mantine-color-dimmed']).toBe('var(--mantine-color-dark-2)');
    expect(resolved.light['--mantine-color-dimmed']).toBe(DIMMED_LIGHT);
  });

  test('the override adds to the resolver instead of replacing it', () => {
    // Mantine still owns every other variable, including the body colour and the
    // primary shades the buttons resolve through.
    const resolved = cssVariablesResolver(mergedTheme('light'));
    expect(resolved.variables['--mantine-primary-color-filled']).toContain('brand');
    expect(resolved.light['--mantine-color-body']).toBe(DEFAULT_THEME.white);
    expect(resolved.light['--mantine-color-text']).toBe(DEFAULT_THEME.black);
  });
});

describe('primary and body text', () => {
  test.each([
    ['body text on the page surface', MANTINE_TEXT, gray[0]],
    ['body text on a raised card', MANTINE_TEXT, WHITE],
    ['primary button label', WHITE, colors.brand[7]],
  ])('%s clears AA', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('status badges', () => {
  // `StatusBadge` renders `variant="light"`, which pairs each palette's lightest
  // step as the background with its darkest step as the label.
  test.each(Object.entries(STATUS_COLORS))('status %s', (_status, palette) => {
    const ramp = colors[palette];
    expect(contrast(ramp[9], ramp[0])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  test('the neutral badge clears AA too', () => {
    expect(contrast(gray[9], gray[0])).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('focus ring', () => {
  // A focus indicator is a UI component, so WCAG 2.2 SC 1.4.11 asks 3:1 — but
  // the app draws it at 2px next to text, so it is held to the text threshold.
  test.each([
    ['raised card', WHITE],
    ['page surface', gray[0]],
  ])('%s', (_label, background) => {
    expect(contrast(colors.brand[6], background)).toBeGreaterThanOrEqual(3);
  });
});
