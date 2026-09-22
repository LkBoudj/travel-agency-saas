import type { MantineThemeComponents } from '@mantine/core';

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
  Table: {
    defaultProps: {
      verticalSpacing: 'sm',
      horizontalSpacing: 'sm',
      withRowBorders: true,
      highlightOnHover: true,
    },
  },
  Modal: {
    defaultProps: {
      centered: true,
      radius: 'md',
      padding: 'lg',
      transitionProps: { transition: 'pop', duration: 150 },
    },
  },
  Drawer: {
    defaultProps: {
      radius: 'md',
      padding: 'lg',
      transitionProps: { transition: 'slide-right', duration: 150 },
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
