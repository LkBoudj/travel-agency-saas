import { Skeleton, Table } from '@mantine/core';

/**
 * The placeholder body of a loading table.
 *
 * Every list used to spell its own skeleton out — usually a hand-built `<div>`
 * with a shimmer — so a page could show a table header, a stack of grey boxes, or
 * a spinner, sometimes all three at once. The shared contract is: same number of
 * columns as the real table, `rows` placeholders, and `data-skeleton` on each one
 * so a placeholder is never mistaken for a record.
 */
export function TableSkeleton({
  columns,
  rows,
}: {
  columns: readonly { key: string }[];
  rows: number;
}) {
  return Array.from({ length: Math.max(0, rows) }).map((_, index) => (
    <Table.Tr key={`skeleton-${index}`} data-skeleton>
      {columns.map((column) => (
        <Table.Td key={column.key}>
          <Skeleton height={12} width="60%" radius="sm" />
        </Table.Td>
      ))}
    </Table.Tr>
  ));
}
