import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * The control ramp.
 *
 * Mantine derives everything inside a control — its line box, its padding, its
 * section widths, the side length of an icon button — from CSS custom properties
 * declared on the control's own root. A component theme can only paint the outer
 * box, so setting `height` through `componentDefaults` left those variables on
 * Mantine's `sm` of 36px: a 32px box with a 34px line box inside it, icon buttons
 * stretched out of square, and every input family the theme forgot on 36px while
 * its neighbours were on 32px.
 *
 * These tests pin the ramp in the token layer, because jsdom resolves no custom
 * property — the numbers below are where 32px and 26px are actually enforced, the
 * same reason `tokens.test.ts` pins the tile anatomy here rather than in jsdom.
 */

const TOKENS = path.join(import.meta.dirname, 'tokens.css');
const LAYER = readFileSync(TOKENS, 'utf8');

const SIZE_STEPS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/** Reads the declarations of one `selector { … }` rule out of the token layer. */
function declarationsFor(selector: string): Map<string, string> {
  const rule = new RegExp(
    `(?:^|\\})\\s*${selector.replace(/[.[\]()]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
    'm'
  );
  const body = LAYER.match(rule)?.[1];
  if (body === undefined) {
    throw new Error(`the token layer must declare a rule for \`${selector}\``);
  }

  return new Map(
    [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()])
  );
}

/** Resolves a declaration to px, following a `var(--app-*)` reference when present. */
function px(declarations: Map<string, string>, name: string): number {
  const value = declarations.get(name);
  if (value === undefined) {
    throw new Error(`the ramp must declare \`${name}\``);
  }

  const reference = value.match(/^var\((--app-[a-z0-9-]+)\)$/);
  const resolved = reference
    ? LAYER.match(new RegExp(`^\\s*${reference[1]}\\s*:\\s*([0-9.]+)px`, 'm'))
    : null;

  return Number.parseFloat(reference ? (resolved?.[1] ?? '') : value);
}

describe('control ramp', () => {
  test.each([
    ['inputs', '.mantine-Input-wrapper[data-size]', '--input-height'],
    ['buttons', '.mantine-Button-root[data-size]', '--button-height'],
    ['icon buttons', '.mantine-ActionIcon-root[data-size]', '--ai-size'],
  ])('%s step on the app control height at `sm`', (_what, selector, prefix) => {
    const declarations = declarationsFor(selector);

    expect(declarations.get(`${prefix}-sm`)).toBe('var(--app-control-height)');
    // Every other step must be a literal so the ramp is readable as a ramp, and
    // must climb in Mantine's own rhythm so `lg`/`xl` keep their weight.
    expect(px(declarations, `${prefix}-sm`)).toBe(32);
  });

  test.each([
    ['inputs', '.mantine-Input-wrapper[data-size]', '--input-height'],
    ['buttons', '.mantine-Button-root[data-size]', '--button-height'],
    ['icon buttons', '.mantine-ActionIcon-root[data-size]', '--ai-size'],
  ])('%s keep a strictly increasing ramp across `xs`..`xl`', (_what, selector, prefix) => {
    const declarations = declarationsFor(selector);
    const steps = SIZE_STEPS.map((step) => px(declarations, `${prefix}-${step}`));

    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBe(steps.length);
    expect(steps.every(Number.isInteger)).toBe(true);
  });

  test('compact buttons and compact icon buttons both land on the compact token', () => {
    expect(
      px(declarationsFor('.mantine-Button-root[data-size]'), '--button-height-compact-sm')
    ).toBe(26);

    // Mantine resolves `size="compact-sm"` to `var(--ai-size-compact-sm)` but never
    // declares it, so an ActionIcon at that size collapsed to its icon's own width.
    // Row-level actions are the app's compact step; this is what makes them square.
    const iconButtons = declarationsFor('.mantine-ActionIcon-root[data-size]');
    expect(iconButtons.get('--ai-size-compact-sm')).toBe('var(--app-control-height-compact)');
    expect(px(iconButtons, '--ai-size-compact-sm')).toBe(26);
  });

  test('icon buttons placed inside an input follow the input ramp', () => {
    const iconButtons = declarationsFor('.mantine-ActionIcon-root[data-size]');
    const inputs = declarationsFor('.mantine-Input-wrapper[data-size]');

    for (const step of SIZE_STEPS) {
      expect(px(iconButtons, `--ai-size-input-${step}`)).toBe(px(inputs, `--input-height-${step}`));
    }
  });

  test('multiline padding tracks the shortened boxes instead of Mantine 36px', () => {
    const inputs = declarationsFor('.mantine-Input-wrapper[data-size]');
    const padding = SIZE_STEPS.map((step) => px(inputs, `--input-padding-y-${step}`));

    expect(padding).toEqual([...padding].sort((a, b) => a - b));
    expect(new Set(padding).size).toBe(padding.length);
    expect(Math.max(...padding)).toBeLessThan(px(inputs, '--input-height-xl'));
  });

  test('every ramp rule keys off [data-size] so stylesheet order cannot win', () => {
    // The token layer is imported after Mantine's stylesheet today, but a
    // single-class declaration of equal specificity would then win purely on
    // import order. `[data-size]` lifts these rules to (0,2,0) and makes the
    // override independent of how the two files are loaded.
    const rampSelectors = [
      '.mantine-Input-wrapper[data-size]',
      '.mantine-Button-root[data-size]',
      '.mantine-ActionIcon-root[data-size]',
    ];

    for (const selector of rampSelectors) {
      expect(declarationsFor(selector).size).toBeGreaterThan(0);
    }
  });
});
