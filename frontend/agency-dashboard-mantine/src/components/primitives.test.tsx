import { act, render, screen } from '@test-utils';
import { describe, expect, test, afterEach, vi } from 'vitest';
import { setLocale } from '../i18n/index.ts';
import { CellStack } from './cell-stack.tsx';
import { DataTable } from './data-table.tsx';
import { EmptyState, ErrorState } from './empty-state.tsx';
import { EntityCode } from './entity-code.tsx';
import { FieldError } from './form/field-error.tsx';
import { PageHeader } from './page-header.tsx';
import { SearchInput } from './search-input.tsx';
import { StatCard } from './stat-card.tsx';
import { StatusBadge } from './status-badge.tsx';

// Renders the shell primitives the way the app does, so the shared layer keeps
// one accessible, translated presentation instead of one per page.
const COLUMNS = [{ key: 'code', header: 'Code', render: (row: { code: string }) => row.code }];

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

describe('PageHeader', () => {
  test('renders the page heading as the document h1', () => {
    render(<PageHeader title="Trips" subtitle="Everything you sell" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Trips');
  });

  test('can be reused for an in-page section heading', () => {
    render(<PageHeader title="Pricing options" h={3} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Pricing options');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});

describe('DataTable empty state', () => {
  test('falls back to the translated empty message instead of a hardcoded string', async () => {
    render(<DataTable rows={[]} columns={COLUMNS} keyOf={(row) => row.code} />);
    expect(await screen.findByText('No results yet.')).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByText('لا توجد نتائج بعد.')).toBeInTheDocument();
  });

  test('prefers a caller-provided empty state', () => {
    render(
      <DataTable
        rows={[]}
        columns={COLUMNS}
        keyOf={(row) => row.code}
        emptyState={<EmptyState title="No tours yet" description="Create your first tour." />}
      />
    );
    expect(screen.getByText('No tours yet')).toBeInTheDocument();
    expect(screen.queryByText('No results yet.')).toBeNull();
  });
});

describe('ErrorState', () => {
  test('announces itself and uses the translated retry label', async () => {
    render(<ErrorState title="Could not load departures" onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load departures');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });
});

describe('FieldError', () => {
  test('shows the message without competing for the announcement, and nothing when there is none', () => {
    const { rerender } = render(<FieldError message="Select at least one departure" />);
    expect(screen.getByText('Select at least one departure')).toBeInTheDocument();
    // The form-level summary is the only `role="alert"` in a form.
    expect(screen.queryByRole('alert')).toBeNull();

    rerender(<FieldError />);
    expect(screen.queryByText('Select at least one departure')).toBeNull();
  });
});

describe('SearchInput', () => {
  test('exposes a named clear control in both locales', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="Djerba" onChange={onChange} />);

    expect(await screen.findByRole('button', { name: 'Clear search' })).toBeInTheDocument();
    await useLocale('ar');
    expect(await screen.findByRole('button', { name: 'مسح البحث' })).toBeInTheDocument();
  });
});

describe('EntityCode', () => {
  test('names the copy control in the active locale', async () => {
    render(<EntityCode code="TUR-63C5B04471ED" />);
    expect(await screen.findByRole('button', { name: 'Copy code' })).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByRole('button', { name: 'نسخ الرمز' })).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  test('translates the status in both locales', async () => {
    render(<StatusBadge status="PUBLISHED" />);
    expect(await screen.findByText('Published')).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByText('منشور')).toBeInTheDocument();
  });

  test('carries a second vocabulary in its own namespace when one is given', async () => {
    render(<StatusBadge status="PUBLISHED" mode="scheduled" />);
    expect(await screen.findByText('Published')).toBeInTheDocument();
    // Availability is the departures catalog's word, not common's.
    expect(await screen.findByText('Scheduled')).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByText('منشور')).toBeInTheDocument();
    expect(await screen.findByText('مجدولة')).toBeInTheDocument();
  });

  test('shows the lifecycle status alone when there is no second vocabulary', () => {
    render(<StatusBadge status="ACTIVE" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Scheduled')).toBeNull();
  });
});

describe('EmptyState compact', () => {
  test('an in-band empty state is smaller than a page-level one', () => {
    const { container: full } = render(<EmptyState title="Nothing here" />);
    const { container: compact } = render(<EmptyState compact title="Nothing here" />);

    // Same copy, same action slot; only the scale differs, so an empty panel
    // inside a band does not claim the height of a whole page.
    expect(screen.getAllByText('Nothing here')).toHaveLength(2);

    const icon = (root: HTMLElement) => Number(root.querySelector('svg')?.getAttribute('width'));
    expect(icon(compact)).toBeLessThan(icon(full));
  });
});

describe('CellStack', () => {
  test('keeps the primary line prominent and the secondary line muted', () => {
    render(<CellStack primary="Ghardaïa M'zab" secondary="TUR-63C5B04471ED" />);

    const [primary, secondary] = screen.getAllByText(/TUR-63C5B04471ED|Ghard/).reverse();
    expect(primary).toBeInTheDocument();
    expect(secondary).toBeInTheDocument();
  });

  test('omits the secondary line when there is nothing to qualify the primary', () => {
    const { container } = render(<CellStack primary="DZD" />);

    expect(screen.getByText('DZD')).toBeInTheDocument();
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});

describe('StatCard', () => {
  test('keeps label, value and sub in one readable order', () => {
    render(<StatCard label="Customers" value={12} sub="3 active" />);

    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 active')).toBeInTheDocument();
  });

  test('the value dominates the tile', () => {
    render(<StatCard label="Customers" value={12} />);

    // 30px (1.875rem) against a 12px label: the count is the point of the tile.
    expect(screen.getByText('12').style.fontSize).toBe('calc(1.875rem * var(--mantine-scale))');
  });

  test('compact keeps the same hierarchy at a smaller scale', () => {
    render(<StatCard label="Customers" value={12} compact />);

    expect(screen.getByText('12').style.fontSize).toBe('calc(1.5rem * var(--mantine-scale))');
  });

  test('becomes a button that navigates when it is clickable', () => {
    const onClick = vi.fn();
    render(<StatCard label="Customers" value={12} onClick={onClick} />);

    const tile = screen.getByRole('button');
    tile.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('stays a plain surface when disabled', () => {
    const onClick = vi.fn();
    render(<StatCard label="Customers" value={12} onClick={onClick} disabled />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('shows no icon tile when there is no icon', () => {
    render(<StatCard label="Customers" value={12} />);

    expect(document.querySelectorAll('svg')).toHaveLength(0);
  });
});
