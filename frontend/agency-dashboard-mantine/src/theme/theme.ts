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
  primaryColor: 'brand',
  // Shade 7 (#15803D) is the lightest brand step that keeps white label text at
  // 5.02:1 — WCAG AA needs 4.5:1 at the 13px button size. Shade 6 measured 3.30:1
  // and the previous dark shade 5 measured 2.28:1. The dashboard renders the light
  // scheme, so `light` is what applies; `dark` is kept in step so re-introducing a
  // dark scheme cannot silently reintroduce the failure. Hover lands on shade 8 (7.13:1).
  primaryShade: { light: 7, dark: 7 },
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
