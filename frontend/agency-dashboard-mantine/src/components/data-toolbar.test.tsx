import { render, screen } from '@test-utils';
import { describe, expect, test } from 'vitest';
import { DataToolbar } from './data-toolbar.tsx';

/**
 * One spacing contract for every list's controls. Search sits on the start side,
 * filters and actions on the end side — the reason the search field used to sit
 * at a different height on every page.
 */
describe('DataToolbar', () => {
  test('puts search on the start side and filters on the end side', () => {
    render(
      <DataToolbar
        search={<input aria-label="Search" />}
        filters={<button type="button">All statuses</button>}
      />
    );

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All statuses' })).toBeInTheDocument();
  });

  test('keeps a count with the end-side controls', () => {
    render(<DataToolbar search={<input aria-label="Search" />} actions={<span>2 results</span>} />);

    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  test('takes extra end-side nodes through children as well', () => {
    render(
      <DataToolbar search={<input aria-label="Search" />} actions={<span>2 results</span>}>
        <button type="button">Export</button>
      </DataToolbar>
    );

    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  test('renders with only a search field, which is the simplest list there is', () => {
    render(<DataToolbar search={<input aria-label="Search" />} />);

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  test('renders a toolbar with nothing in it without falling over', () => {
    expect(() => render(<DataToolbar />)).not.toThrow();
  });
});
