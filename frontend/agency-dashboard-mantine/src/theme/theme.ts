import { createTheme, defaultCssVariablesResolver, type CSSVariablesResolver } from '@mantine/core';
import { colors } from './colors';
import { componentDefaults } from './component-defaults';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import {
  fontFamily,
  fontFamilyMonospace,
  fontSizes,
  fontWeights,
  headings,
  lineHeights,
} from './typography';

/**
 * The app's override for Mantine's light-scheme `dimmed`.
 *
 * Mantine's light `dimmed` is `gray-6`, which is 4.51:1 on white — but this app
 * paints secondary text on the gray-0 page (4.31:1) and on the gray-1 sunken
 * table header (4.08:1), so `c="dimmed"` failed AA on the two surfaces it is
 * actually used on. One step darker clears both with headroom. The dark scheme
 * keeps Mantine's own value. `contrast.test.ts` holds both numbers.
 */
export const DIMMED_LIGHT = 'var(--mantine-color-gray-7)';

/**
 * Added to Mantine's own CSS variables, not substituted for them: the provider
 * deep-merges this over `defaultCssVariablesResolver`, so every other variable
 * Mantine owns is untouched.
 */
export const cssVariablesResolver: CSSVariablesResolver = (resolvedTheme) => {
  const base = defaultCssVariablesResolver(resolvedTheme);
  return { ...base, light: { ...base.light, '--mantine-color-dimmed': DIMMED_LIGHT } };
};

export const theme = createTheme({
  colors,
  // Primary actions are near-black fills with a white label, not a brand hue:
  // the workspace and the sidebar are both neutral, so the action that matters
  // most is the one with the most contrast against them. `brand` survives as an
  // accent and as the green behind every success state — it is simply no longer
  // what "primary" means.
  primaryColor: 'ink',
  // Shade 8 (`#1A1A1A`) holds 17.4:1 against its own white label; shade 9 is the
  // hover. Pinned per scheme so re-introducing a dark scheme cannot shift the
  // fill out from under its label.
  primaryShade: { light: 8, dark: 8 },
  autoContrast: true,
  fontFamily,
  fontFamilyMonospace,
  fontSizes,
  fontWeights,
  lineHeights,
  headings,
  spacing,
  radius,
  shadows,
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  fontSmoothing: true,
  components: componentDefaults,
});
