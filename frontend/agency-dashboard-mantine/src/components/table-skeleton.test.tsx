import { render } from '@test-utils';
import { describe, expect, test } from 'vitest';
import { Table } from '@mantine/core';
import { TableSkeleton } from './table-skeleton.tsx';

const COLUMNS = [
  { key: 'code', header: 'Code' },
  { key: 'status', header: 'Status' },
  { key: 'start', header: 'Start' },
];

function renderSkeleton(rows: number) {
  const { container } = render(
    <Table>
      <Table.Tbody>
        <TableSkeleton columns={COLUMNS} rows={rows} />
      </Table.Tbody>
    </Table>
  );
  return container;
}

describe('TableSkeleton', () => {
  test('draws one placeholder row per requested row, never fewer', () => {
    const container = renderSkeleton(4);

    expect(container.querySelectorAll('tr[data-skeleton]')).toHaveLength(4);
  });

  test('gives every placeholder row the real table’s column count', () => {
    const container = renderSkeleton(2);

    // A narrower placeholder would make the table reflow when the rows land.
    for (const row of container.querySelectorAll('tr[data-skeleton]')) {
      expect(row.querySelectorAll('td')).toHaveLength(COLUMNS.length);
    }
  });

  test('marks placeholders so they are never read as records', () => {
    const container = renderSkeleton(1);

    expect(container.querySelector('tr[data-skeleton]')).toBeInTheDocument();
  });

  test('draws nothing for a zero or negative count instead of throwing', () => {
    expect(renderSkeleton(0).querySelectorAll('tr[data-skeleton]')).toHaveLength(0);
    expect(renderSkeleton(-3).querySelectorAll('tr[data-skeleton]')).toHaveLength(0);
  });
});
