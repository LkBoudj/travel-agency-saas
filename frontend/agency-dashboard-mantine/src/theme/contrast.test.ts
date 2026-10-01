import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_THEME,
  mergeMantineTheme,
  type MantineColorScheme,
  type MantineTheme,
} from '@mantine/core';
import { colors, STATUS_COLORS } from './colors.ts';
import { radius } from './radius.ts';
import { shadows } from './shadows.ts';
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
    expect(resolved.variables['--mantine-primary-color-filled']).toContain('ink');
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
  // The ring is neutral ink, not the brand hue: with a near-black primary action
  // a green ring read as a second accent rather than as "you are here".
  test.each([
    ['raised card', WHITE],
    ['page surface', gray[0]],
  ])('%s', (_label, background) => {
    expect(contrast(colors.ink[8], background)).toBeGreaterThanOrEqual(3);
  });
});

describe('warm neutral surface system', () => {
  // The redesign spec pins the neutrals by hex. These assertions exist so a future
  // "let's warm it up a bit" edit cannot quietly reintroduce the cool ramp.
  test('the surface and border neutrals are the specified values', () => {
    expect(gray[0]).toBe('#F6F6F7'); // page workspace
    expect(gray[1]).toBe('#F7F7F7'); // sunken — table header, toolbar
    expect(gray[2]).toBe('#F1F1F3'); // skeleton
    expect(gray[3]).toBe('#E3E3E3'); // border subtle
    expect(gray[4]).toBe('#D8D8D8'); // border strong
  });

  test('primary text is near-black, not a hue', () => {
    expect(gray[9]).toBe('#1A1A1A');
  });

  test('secondary text clears AA on every surface the app renders it on', () => {
    for (const background of [WHITE, gray[0], gray[1]]) {
      expect(contrast(gray[7], background)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  test('the ramp is neutral — no step is tinted toward a hue', () => {
    // A warm neutral has R≈G≈B. Anything with a channel spread beyond 2/255 has
    // picked up a hue and will read cool or warm against the sidebar.
    for (const step of gray) {
      const [r, g, b] = hex(step);
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(2);
    }
  });
});

describe('primary action is a dark filled button', () => {
  test('the primary palette is ink, not a brand hue', () => {
    expect(theme.primaryColor).toBe('ink');
  });

  test.each([7, 8, 9])('ink shade %i carries a white label at AA', (shade) => {
    expect(contrast(WHITE, colors.ink[shade])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  test('the light scheme fills with the near-black step', () => {
    const resolved = cssVariablesResolver(mergedTheme('light'));
    expect(resolved.variables['--mantine-primary-color-filled']).toContain('ink');
  });
});

describe('dark navigation surface', () => {
  // Read from the token layer rather than a duplicated literal, so the hex the
  // sidebar paints is the hex these numbers are about.
  const tokens = readFileSync(path.resolve(import.meta.dirname, 'tokens.css'), 'utf8');
  const navToken = (name: string): string =>
    tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? '';

  test('declares the four nav surface tokens', () => {
    for (const token of [
      '--app-surface-nav',
      '--app-nav-hover',
      '--app-nav-active',
      '--app-nav-text',
    ]) {
      expect(navToken(token)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  test('nav item labels clear AA on the nav surface', () => {
    expect(
      contrast(navToken('--app-nav-text'), navToken('--app-surface-nav'))
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  test('muted nav labels clear AA on the nav surface', () => {
    expect(
      contrast(navToken('--app-nav-text-muted'), navToken('--app-surface-nav'))
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  test('hover and active are two distinct steps above the nav surface', () => {
    // `#1F1F1F` on `#0B0B0B` is only ~1.19:1 — below anything WCAG would call a
    // distinguishable state, and correctly so: these are chrome states, not
    // meaning-bearing indicators, and the spec calls for restraint. What has to
    // hold is that the two are separate steps and both sit above the rail, so
    // "where am I" and "where can I go" never look like the same row.
    const rail = luminance(navToken('--app-surface-nav'));
    const hover = luminance(navToken('--app-nav-hover'));
    const active = luminance(navToken('--app-nav-active'));

    expect(hover).toBeGreaterThan(rail);
    expect(active).toBeGreaterThan(hover);
    expect(navToken('--app-nav-active')).not.toBe(navToken('--app-nav-hover'));
  });

  test('nav labels still clear AA when raised on the hover and active fills', () => {
    for (const fill of ['--app-nav-hover', '--app-nav-active']) {
      expect(contrast(navToken('--app-nav-text'), navToken(fill))).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe('restrained geometry', () => {
  test('the default radius is 6px, not 8', () => {
    expect(radius.md).toBe('0.375rem');
  });

  test('the radius ramp never exceeds 8px', () => {
    for (const value of Object.values(radius)) {
      expect(Number.parseFloat(value)).toBeLessThanOrEqual(0.5);
    }
  });

  test('shadows are neutral — no blue-tinted rgba', () => {
    for (const value of Object.values(shadows)) {
      expect(value).toMatch(/rgba\(0,0,0/);
    }
  });

  test('the heaviest shadow stays under 12% black', () => {
    for (const value of Object.values(shadows)) {
      const alpha = Number.parseFloat(value.match(/rgba\(0,0,0,([\d.]+)\)/)?.[1] ?? '1');
      expect(alpha).toBeLessThanOrEqual(0.12);
    }
  });
});
