import type { ReactNode } from 'react';
import { Stack, Text, type TextProps } from '@mantine/core';

/**
 * A table cell with a primary line and an optional secondary line.
 *
 * Half the tables in the product render "name / code" or "customer / seats" and
 * were each spacing that by hand; the `flex: 1` and per-cell `gap` differences
 * are what made rows line up differently on every page.
 *
 * `primaryProps`/`secondaryProps` cover the few cells that genuinely need a
 * different face — a monospaced code, a right-aligned amount — without every
 * call site dropping back to a hand-built `Stack`.
 */
export function CellStack({
  primary,
  secondary,
  align = 'start',
  primaryProps,
  secondaryProps,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  align?: 'start' | 'end';
  primaryProps?: TextProps;
  secondaryProps?: TextProps;
}) {
  return (
    <Stack gap={0} align={align} style={{ minWidth: 0 }}>
      <Text size="sm" fw={500} truncate {...primaryProps}>
        {primary}
      </Text>
      {secondary ? (
        <Text size="xs" c="dimmed" truncate {...secondaryProps}>
          {secondary}
        </Text>
      ) : null}
    </Stack>
  );
}
