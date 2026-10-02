import type { CSSProperties } from 'react';
import type { MantineThemeComponents, ModalProps } from '@mantine/core';

type OverlayTransition = NonNullable<ModalProps['transitionProps']>;

/**
 * One height for every control that defaults to `sm`.
 *
 * Mantine's `sm` is 36px, sized for a standalone form. Beside a 13px table row
 * it left a visible step between a control and the row it filters, so `sm` is
 * pinned to `--app-control-height` (32px) here instead of at each call site.
 *
 * Applied through `styles` rather than a custom `size` entry: in Mantine 9
 * `createVarsResolver` is the identity function and `MantineThemeComponent` no
 * longer accepts `sizes`, so a named size cannot be declared in the theme at all.
 * The row-action step uses Mantine's own built-in `compact-sm` (26px) for the
 * same reason — the framework already ships it, so overriding it would only add
 * a second source of truth for a value Mantine owns.
 *
 * Two shapes, because the height does not live on the same slot everywhere: on
 * `Button`/`ActionIcon` the root *is* the control, while on every text input the
 * root is a wrapper around a separate `input` element that carries the height.
 * Setting the wrapper alone left a 32px box around a 36px input.
 *
 * `minHeight` is set alongside `height` because `.mantine-Input-input` carries
 * `min-height: var(--input-height)` in Mantine's own stylesheet. `min-height`
 * clamps `height`, so an inline `height` alone is silently ignored and the field
 * stays 36px tall inside a 32px wrapper.
 */
const CONTROL_ROOT: CSSProperties = {
  height: 'var(--app-control-height)',
  minHeight: 'var(--app-control-height)',
};
const CONTROL_INPUT: Record<string, CSSProperties> = { root: CONTROL_ROOT, input: CONTROL_ROOT };

/**
 * Honours the OS "reduce motion" setting for the animated surfaces. The theme is
 * a module constant, so the query is read once at boot: a user who changes the
 * setting mid-session gets it on the next load, which is the same contract
 * every other read-once theme decision has.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function overlayTransition(transition: OverlayTransition): OverlayTransition {
  return prefersReducedMotion() ? { ...transition, duration: 0 } : transition;
}

export const componentDefaults: MantineThemeComponents = {
  Button: {
    defaultProps: { size: 'sm', radius: 'md' },
    styles: { root: CONTROL_ROOT },
  },
  ActionIcon: {
    defaultProps: { size: 'sm', radius: 'md' },
    styles: CONTROL_INPUT,
  },
  TextInput: {
    defaultProps: { size: 'sm' },
    styles: CONTROL_INPUT,
  },
  PasswordInput: {
    defaultProps: { size: 'sm' },
    styles: CONTROL_INPUT,
  },
  NumberInput: {
    defaultProps: { size: 'sm' },
    styles: CONTROL_INPUT,
  },
  Textarea: {
    defaultProps: { size: 'sm' },
    styles: CONTROL_INPUT,
  },
  Select: {
    defaultProps: { size: 'sm' },
    styles: CONTROL_INPUT,
  },
  Combobox: {
    defaultProps: {},
  },
  Card: {
    defaultProps: { withBorder: true, radius: 'md', padding: 'md' },
  },
  Table: {
    defaultProps: {
      fz: 'sm',
      verticalSpacing: 'sm',
      horizontalSpacing: 'sm',
      // One contract for every table in the product: bottom-only separators in
      // the neutral token, and row hover through the token that was already
      // declared but never wired. Both default to a blue-tinted palette step, so
      // leaving either unset is how the cast sneaks back in.
      borderColor: 'var(--app-table-separator)',
      withRowBorders: true,
      withColumnBorders: false,
      highlightOnHover: true,
      highlightOnHoverColor: 'var(--app-row-hover)',
    },
    styles: {
      th: {
        backgroundColor: 'var(--app-table-header-surface)',
        color: 'var(--mantine-color-dimmed)',
        fontWeight: 600,
        fontSize: 'var(--mantine-font-size-xs)',
      },
    },
  },
  Modal: {
    defaultProps: {
      centered: true,
      radius: 'md',
      padding: 'lg',
      transitionProps: overlayTransition({ transition: 'pop', duration: 150 }),
    },
  },
  Drawer: {
    defaultProps: {
      radius: 'md',
      padding: 'lg',
      transitionProps: overlayTransition({ transition: 'slide-right', duration: 150 }),
    },
  },
  Tooltip: {
    defaultProps: {
      withArrow: true,
      openDelay: 250,
      radius: 'sm',
    },
  },
  Badge: {
    defaultProps: {
      size: 'sm',
      radius: 'sm',
      variant: 'light',
    },
  },
};
