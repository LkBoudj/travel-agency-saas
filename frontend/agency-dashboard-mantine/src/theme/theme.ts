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
  primaryShade: { light: 6, dark: 7 },
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
