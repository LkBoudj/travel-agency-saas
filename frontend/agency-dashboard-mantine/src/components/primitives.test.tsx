import { act, render, screen } from '@test-utils';
import { describe, expect, test, afterEach, vi } from 'vitest';
import { setLocale } from '../i18n/index.ts';
import { DataTable } from './data-table.tsx';
import { EmptyState, ErrorState } from './empty-state.tsx';
import { EntityCode } from './entity-code.tsx';
import { FieldError } from './form/field-error.tsx';
import { PageHeader } from './page-header.tsx';
import { SearchInput } from './search-input.tsx';
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
  test('announces the message and renders nothing when there is none', () => {
    const { rerender } = render(<FieldError message="Select at least one departure" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one departure');

    rerender(<FieldError />);
    expect(screen.queryByRole('alert')).toBeNull();
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
});
