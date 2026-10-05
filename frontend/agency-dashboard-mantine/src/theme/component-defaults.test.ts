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

/**
 * Control geometry is the token layer's job, not this module's.
 *
 * `styles` can only paint the outer box. Everything inside a control — its line
 * box, its padding, its section widths, an icon button's side length — is derived
 * by Mantine from custom properties on the control's root, and setting `height`
 * here left those on Mantine's 36px `sm`: a 32px box with a 34px line box in it,
 * icon buttons stretched out of square, and each input family on a different step
 * depending on whether this module remembered it. The ramp in `control-ramp.ts`
 * re-steps the variables themselves, so no entry may paint a control height again.
 */
const CONTROL_COMPONENTS = [
  'ActionIcon',
  'Button',
  'Checkbox',
  'ColorInput',
  'Input',
  'MultiSelect',
  'NumberInput',
  'PasswordInput',
  'PillInput',
  'Radio',
  'SegmentedControl',
  'Select',
  'Switch',
  'Textarea',
  'TextInput',
] as const;

describe('control geometry', () => {
  test('no control paints its own height', async () => {
    const defaults = await defaultsWithReducedMotion(false);

    const offenders = CONTROL_COMPONENTS.flatMap((name) => {
      const styles = (defaults[name]?.styles ?? {}) as Record<string, object | undefined>;

      return Object.entries(styles)
        .filter(([, value]) => value != null && 'height' in value)
        .map(([slot, value]) => `${name}.styles.${slot} paints ${JSON.stringify(value)}`);
    });

    expect(offenders).toEqual([]);
  });
});

/**
 * The table contract.
 *
 * Every table in the product — bookings, customers, departures, invitations,
 * members, pricing, tours, plus the price-line table on a booking's detail view —
 * renders through `Table`, so this one block is what makes them look like one
 * system. The value under test is not taste: it is that a table cannot quietly
 * acquire its own header colour or separator. Each key is asserted against the
 * token it must name, because a hardcoded hex or a `gray-N` step would pass a
 * shape check while reintroducing the cast the redesign removes.
 */
describe('table contract', () => {
  async function tableDefaults() {
    const defaults = await defaultsWithReducedMotion(false);
    return defaults.Table!;
  }

  test('the header band is the neutral token, not a palette step', async () => {
    const table = await tableDefaults();

    expect(table.styles?.th).toMatchObject({
      backgroundColor: 'var(--app-table-header-surface)',
    });
  });

  test('the separator is the neutral token', async () => {
    const table = await tableDefaults();

    // `borderColor` drives `--table-border-color`, which Mantine draws as the
    // `tr` border-bottom. Unset, it falls back to gray-3 and the separator
    // arrives blue-tinted.
    expect(table.defaultProps?.borderColor).toBe('var(--app-table-separator)');
  });

  test('row hover resolves through the token the product already declares', async () => {
    const table = await tableDefaults();

    expect(table.defaultProps?.highlightOnHover).toBe(true);
    expect(table.defaultProps?.highlightOnHoverColor).toBe('var(--app-row-hover)');
  });

  test('separators stay bottom-only, with no column grid', async () => {
    const table = await tableDefaults();

    expect(table.defaultProps?.withRowBorders).toBe(true);
    expect(table.defaultProps?.withColumnBorders).toBe(false);
    expect(table.defaultProps?.withTableBorder).toBeUndefined();
  });
});
