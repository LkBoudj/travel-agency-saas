import type { ReactNode } from 'react';
import { Group } from '@mantine/core';

/**
 * One spacing contract for every list's controls: search on the start side,
 * filters and actions on the end side, stacked full-width below `sm`.
 *
 * Every list page used to invent its own wrapper, which is why the search field
 * sat at a different height on every page. Search, filters and actions are
 * passed as nodes so the pages keep owning their own controls.
 */
export function DataToolbar({
  search,
  filters,
  actions,
  children,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  /** Anything else that belongs on the end side (counts, toggles). */
  children?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" gap="sm" wrap="wrap">
      <Group gap="sm" align="flex-end" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
        {search}
        {filters}
      </Group>
      <Group gap="sm" align="flex-end" wrap="wrap">
        {children}
        {actions}
      </Group>
    </Group>
  );
}
