import type { ReactNode } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';

/**
 * One clickable overview KPI. Renders a large count under a small uppercase
 * label with an optional sub-line; the whole card navigates when `onClick`
 * is given and `disabled` is false.
 */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  onClick,
  disabled,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const clickable = onClick !== undefined && !disabled;
  return (
    <UnstyledButton
      component={clickable ? 'button' : 'div'}
      onClick={clickable ? onClick : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
      w="100%"
    >
      <Card
        withBorder
        radius="md"
        p="md"
        h="100%"
        style={clickable ? { transition: 'box-shadow .15s ease' } : undefined}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} truncate>
              {label}
            </Text>
            <Text fw={700} size="xl" lh={1.2} tabular-nums>
              {value}
            </Text>
            {sub ? (
              <Text size="xs" c="dimmed">
                {sub}
              </Text>
            ) : null}
          </Stack>
          <Group gap={4} wrap="nowrap">
            {icon}
            {clickable ? <IconChevronRight size={16} stroke={1.5} aria-hidden /> : null}
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
