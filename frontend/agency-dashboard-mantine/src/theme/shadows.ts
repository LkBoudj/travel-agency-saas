/**
 * Minimal, neutral elevation.
 *
 * The workspace separates things with borders, not shadows — so these exist for
 * the surfaces that genuinely float: menus, popovers, drawers, dialogs. Two rules
 * hold them together: the colour is pure black (the old ramp was
 * `rgba(16,24,40,…)`, a blue tint that showed as a cold cast against a warm
 * neutral workspace), and no step exceeds 12% opacity.
 *
 * Every key is kept because Mantine components address shadows by name — removing
 * one would break `shadow="md"` at the call site, not here.
 */
export const shadows = {
  xs: '0 1px 2px rgba(0,0,0,0.04)',
  sm: '0 1px 2px rgba(0,0,0,0.06)',
  md: '0 2px 6px rgba(0,0,0,0.07)',
  lg: '0 4px 10px rgba(0,0,0,0.09)',
  xl: '0 8px 20px rgba(0,0,0,0.11)',
} as const;
