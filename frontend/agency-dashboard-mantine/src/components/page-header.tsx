import type { ReactNode } from 'react';
import { Box, Group, Stack, Title, type TitleProps } from '@mantine/core';

/**
 * Page-level header. Renders the document's single `h1` by default — every route
 * mounts exactly one `PageHeader`, so a11y and SEO get a real page heading for
 * free. Pass `h={2}`/`h={3}` only when the component is reused for an in-page
 * section heading instead of the page title.
 */
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
        <Title order={h ?? 1}>{title}</Title>
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
