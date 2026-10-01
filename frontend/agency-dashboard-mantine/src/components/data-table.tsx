import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '@mantine/core';
import { EmptyState } from './empty-state.tsx';
import { TableSkeleton } from './table-skeleton.tsx';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  w?: string | number;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  keyOf: (row: T) => string;
  /** Rows to draw while loading. Defaults to 5. */
  skeletonRows?: number;
  /** Kept for call sites still using the old name. */
  loading?: boolean;
  /** Per-table min width, so a wide table scrolls instead of squashing. */
  minWidth?: number;
  /** Keeps the header row visible while the page scrolls under it. */
  stickyHeader?: boolean;
  /** Accessible description of the table. */
  caption?: string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Accessible name for a clickable row; defaults to its cell text. */
  rowLabel?: (row: T) => string;
}

/**
 * A sticky header cell has to carry its own background, otherwise the rows
 * scrolling underneath show through it. The offset is the app shell's header:
 * a sticky cell at `top: 0` disappears behind the shell header.
 */
const STICKY_CELL: CSSProperties = {
  position: 'sticky',
  top: 'var(--app-header-height, 60px)',
  zIndex: 1,
  background: 'var(--app-surface-raised)',
};

export function DataTable<T>({
  rows,
  columns,
  keyOf,
  skeletonRows = 5,
  loading,
  minWidth = 640,
  stickyHeader = false,
  caption,
  emptyState,
  onRowClick,
  rowLabel,
}: DataTableProps<T>) {
  const { t } = useTranslation('common');

  const activate = (event: React.KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) {
      return;
    }
    // Enter and Space are the two keys that mean "activate" everywhere else;
    // without them a clickable row is a mouse-only affordance.
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table aria-label={caption}>
        {caption ? <Table.Caption>{caption}</Table.Caption> : null}
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => (
              <Table.Th
                key={column.key}
                w={column.w}
                className={column.className}
                style={stickyHeader ? STICKY_CELL : undefined}
              >
                {column.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            // As many placeholder rows as the list will hold, so the table does
            // not jump when the real rows land.
            <TableSkeleton columns={columns} rows={skeletonRows} />
          ) : rows.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length} align="center">
                {/* Falls back to the shared, translated empty presentation so a
                    table that has no results never leaks an untranslated string;
                    pages pass a richer node with the next action when they have one. */}
                {emptyState ?? <EmptyState title={t('empty')} />}
              </Table.Td>
            </Table.Tr>
          ) : (
            rows.map((row) => (
              <Table.Tr
                key={keyOf(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => activate(event, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((column) => (
                  <Table.Td key={column.key} className={column.className}>
                    {column.render(row)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
