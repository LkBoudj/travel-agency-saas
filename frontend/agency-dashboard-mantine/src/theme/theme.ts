import { createTheme } from '@mantine/core';
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

export const theme = createTheme({
  colors,
  primaryColor: 'brand',
  // Shade 7 (#15803D) is the lightest brand step that keeps white label text at
  // 5.02:1 — WCAG AA needs 4.5:1 at the 13px button size. Shade 6 measured 3.30:1
  // and the previous dark shade 5 measured 2.28:1. The app is `forceColorScheme="dark"`,
  // so `dark` is what actually renders; `light` is kept in step so removing the
  // forced scheme cannot silently reintroduce the failure. Hover lands on shade 8 (7.13:1).
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
  defaultGradient: { from: 'brand', to: 'info', deg: 120 },
  components: componentDefaults,
});
