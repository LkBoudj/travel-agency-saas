import type { ReactNode } from 'react';
import { Group, Stack, Text, Title, type TitleProps } from '@mantine/core';

/**
 * The heading row of an in-page section: a real `h2`, an optional sentence that
 * says what the section is for, and the actions that belong to it.
 *
 * `PageHeader` owns the page's single `h1`; this is the same shape one level
 * down, so every band on every page sits at the same height and the same
 * distance from its content.
 */
export function SectionHeader({
  title,
  description,
  actions,
  count,
  h = 2,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Trailing metadata such as a result count. */
  count?: ReactNode;
  h?: TitleProps['order'];
}) {
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="wrap">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Group gap="xs" align="baseline" wrap="nowrap">
          <Title order={h} fz="md">
            {title}
          </Title>
          {count}
        </Group>
        {description ? (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Group gap="sm">{actions}</Group> : null}
    </Group>
  );
}
