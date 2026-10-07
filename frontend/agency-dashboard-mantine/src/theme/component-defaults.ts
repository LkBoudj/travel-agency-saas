import type { MantineThemeComponents, ModalProps } from '@mantine/core';

type OverlayTransition = NonNullable<ModalProps['transitionProps']>;

/**
 * Control sizes are the token layer's job.
 *
 * Every control that defaults to `md` reads `--input-height-md` (42px) and
 * `--button-height-md` (42px), while row-level actions read
 * `--app-control-height-compact` (26px) via `compact-sm`. This module therefore
 * sets no control heights directly in `styles`: the ramp in `tokens.css` re-steps
 * the size variables Mantine derives a control's line box, padding and section
 * widths from, which is the only place that can move the box and its contents
 * onto the same number at once.
 *
 * What is left here are the decisions a stylesheet cannot express — that `md`
 * (42px) is the default step for form inputs and buttons, and the corner radius.
 */

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
    defaultProps: { size: 'md', radius: 'md' },
  },
  ActionIcon: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  TextInput: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  PasswordInput: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  Select: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  MultiSelect: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  NumberInput: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  Textarea: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  Autocomplete: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  NativeSelect: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  Input: {
    defaultProps: { size: 'md', radius: 'md' },
  },
  InputBase: {
    defaultProps: { size: 'md', radius: 'md' },
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
      horizontalSpacing: 'md',
      // One contract for every table in the product: bottom-only separators in
      // the neutral token, and row hover through the token that was already
      // declared but never wired.
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
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      },
      td: {
        fontSize: 'var(--mantine-font-size-sm)',
        color: 'var(--mantine-color-text)',
        verticalAlign: 'middle',
      },
    },
  },
  TableScrollContainer: {
    defaultProps: {
      type: 'native',
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
