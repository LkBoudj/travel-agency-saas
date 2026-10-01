import type { CSSProperties, ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Box, Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { useIsRtl } from '../i18n/hooks/use-is-rtl';

/** Figures that sit in a column must not shift width as they change. */
const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

/**
 * One number with its label and an optional sub-line.
 *
 * The hierarchy is deliberate and is the reason this is a shared component: a
 * label you can read at arm's length (12px, uppercase, muted), a value that
 * dominates the tile (30px, tabular so a changing count does not shift the
 * layout), and a sub-line that qualifies it. `compact` keeps the same order at
 * a smaller scale for in-page panels.
 *
 * Hairline border, no shadow: four tiles in a row with shadows read as four
 * objects floating; with hairlines they read as one row of a table.
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  onClick,
  disabled,
  compact = false,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const clickable = onClick !== undefined && !disabled;
  // "Forward" is a logical direction: in RTL the tile points leftwards, so the
  // chevron has to turn with the text or it contradicts the reading direction.
  const isRtl = useIsRtl();

  return (
    <UnstyledButton
      component={clickable ? 'button' : 'div'}
      onClick={clickable ? onClick : undefined}
      w="100%"
      style={{ textAlign: 'start' }}
    >
      <Card withBorder radius="md" p={compact ? 'md' : 'lg'} h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Stack gap={compact ? 2 : 4} style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} truncate>
              {label}
            </Text>
            <Text fz={compact ? 24 : 30} fw={600} lh={1.15} style={TABULAR}>
              {value}
            </Text>
            {sub ? (
              <Text size="xs" c="dimmed">
                {sub}
              </Text>
            ) : null}
          </Stack>
          {icon || clickable ? (
            <Group gap={6} wrap="nowrap">
              {icon ? (
                <Box
                  bg="var(--app-surface-sunken)"
                  c="dimmed"
                  p={6}
                  style={{ borderRadius: 'var(--mantine-radius-md)', display: 'flex' }}
                >
                  {icon}
                </Box>
              ) : null}
              {clickable ? (
                isRtl ? (
                  <IconChevronLeft size={16} stroke={1.5} aria-hidden />
                ) : (
                  <IconChevronRight size={16} stroke={1.5} aria-hidden />
                )
              ) : null}
            </Group>
          ) : null}
        </Group>
      </Card>
    </UnstyledButton>
  );
}
