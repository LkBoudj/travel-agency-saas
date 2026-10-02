import type { ReactNode } from 'react';
import { Group, Stack, Text, Title, type TitleProps } from '@mantine/core';

/**
 * Page-level header. Renders the document's single `h1` by default — every route
 * mounts exactly one `PageHeader`, so a11y and SEO get a real page heading for
 * free. Pass `h={2}`/`h={3}` only when the component is reused for an in-page
 * section heading instead of the page title.
 */
export function PageHeader({
  title,
  subtitle,
  meta,
  actions,
  h,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /**
   * Tertiary metadata rendered on its own line under the subtitle — a status
   * badge, an entity code, a slug. It belongs to the title block, not to
   * `actions`, so the action row stays a strict primary → secondary hierarchy.
   */
  meta?: ReactNode;
  actions?: ReactNode;
  h?: TitleProps['order'];
}) {
  return (
    <Group justify="space-between" align={actions ? 'center' : 'flex-start'} wrap="wrap" gap="sm">
      <Stack gap={2}>
        <Title order={h ?? 1}>{title}</Title>
        {subtitle ? (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        ) : null}
        {meta}
      </Stack>
      {/* Marked so a page's "exactly one primary action" rule is testable
          without depending on the header's internal DOM shape. */}
      {actions ? (
        <Group gap="sm" data-testid="page-actions">
          {actions}
        </Group>
      ) : null}
    </Group>
  );
}
