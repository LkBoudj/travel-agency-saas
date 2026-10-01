/**
 * Restrained radius ramp.
 *
 * The redesign spec asks for a quiet, operational surface: nothing rounds by more
 * than 8px, and the default control radius is 6px. The steps are kept because
 * Mantine components address them by name, but the whole ramp now sits inside
 * one narrow band so a component cannot ask for a pill by reaching for `xl`.
 */
export const radius = {
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.5rem',
} as const;
