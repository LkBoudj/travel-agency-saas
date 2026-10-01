import type { MantineThemeComponents, ModalProps } from '@mantine/core';

type OverlayTransition = NonNullable<ModalProps['transitionProps']>;

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
  },
  ActionIcon: {
    defaultProps: { size: 'sm', radius: 'md' },
  },
  TextInput: {
    defaultProps: { size: 'sm' },
  },
  PasswordInput: {
    defaultProps: { size: 'sm' },
  },
  NumberInput: {
    defaultProps: { size: 'sm' },
  },
  Textarea: {
    defaultProps: { size: 'sm' },
  },
  Select: {
    defaultProps: { size: 'sm' },
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
      withRowBorders: true,
      withColumnBorders: false,
      highlightOnHover: true,
    },
    styles: {
      th: {
        backgroundColor: 'var(--app-surface-sunken)',
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
