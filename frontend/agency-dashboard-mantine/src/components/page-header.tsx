import type { ReactNode } from 'react';
import { Box, Group, Stack, Title, type TitleProps } from '@mantine/core';

export function PageHeader({
  title,
  subtitle,
  actions,
  h,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  h?: TitleProps['order'];
}) {
  return (
    <Group justify="space-between" align={actions ? 'center' : 'flex-start'} wrap="wrap" gap="sm">
      <Stack gap={2}>
        <Title order={h ?? 2}>{title}</Title>
        {subtitle ? (
          <Box c="dimmed" size="sm">
            {subtitle}
          </Box>
        ) : null}
      </Stack>
      {actions ? <Group gap="sm">{actions}</Group> : null}
    </Group>
  );
}
