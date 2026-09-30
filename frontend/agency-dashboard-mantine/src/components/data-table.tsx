import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '@mantine/core';
import { EmptyState } from './empty-state.tsx';

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
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  rows,
  columns,
  keyOf,
  loading,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  const { t } = useTranslation('common');

  return (
    <Table.ScrollContainer minWidth={640}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => (
              <Table.Th key={column.key} w={column.w} className={column.className}>
                {column.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Table.Tr key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <Table.Td key={column.key}>
                    <div data-skeleton style={{ height: 12, borderRadius: 4 }} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
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
