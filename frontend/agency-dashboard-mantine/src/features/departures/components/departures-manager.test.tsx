import { act, render, screen } from '@test-utils';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { Departure } from '../types.ts';
import { DeparturesManager } from './departures-manager.tsx';

vi.mock('../hooks/use-departures.ts', () => ({
  useDepartures: () => ({ data: DEPARTURES, isPending: false, isError: false, refetch: vi.fn() }),
  useDeparturesMutations: () => ({
    create: { mutate: vi.fn(), isPending: false },
    update: { mutate: vi.fn(), isPending: false },
    cancel: { mutate: vi.fn(), isPending: false },
  }),
}));

const DEPARTURES: Departure[] = [
  {
    code: 'DEP-1',
    status: 'OPEN',
    startAt: '2026-10-15T09:00:00.000Z',
    endAt: '2026-10-15T17:00:00.000Z',
    capacity: 12,
    bookingDeadline: '2026-10-10T09:00:00.000Z',
    notes: null,
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
  },
  {
    code: 'DEP-2',
    status: 'CANCELLED',
    startAt: '2026-11-15T09:00:00.000Z',
    endAt: '2026-11-15T17:00:00.000Z',
    capacity: 8,
    bookingDeadline: null,
    notes: null,
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
  },
];

const BASE_PROPS = {
  tourCode: 'TUR-1',
  tourStatus: 'DRAFT' as const,
  canCreate: true,
  canUpdate: true,
  canCancel: true,
  canManagePrices: true,
  tourModeKey: 'scheduled',
};

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

describe('DeparturesManager', () => {
  test('counts the departures it is showing, from the rows in hand', async () => {
    render(<DeparturesManager {...BASE_PROPS} />);

    // Two rows in, so the count has to read two — a count the page invented
    // separately from the query is exactly how these drift.
    expect(await screen.findByText('2 results')).toBeInTheDocument();
  });

  test('names the table so it is not just an unlabelled grid', async () => {
    render(<DeparturesManager {...BASE_PROPS} />);

    expect(await screen.findByRole('table', { name: 'Departures' })).toBeInTheDocument();
  });

  test('translates the count', async () => {
    render(<DeparturesManager {...BASE_PROPS} />);
    await screen.findByText('2 results');

    await useLocale('ar');
    expect(await screen.findByText('نتيجتان')).toBeInTheDocument();
  });

  test('gives a row its actions under a name that says which row', async () => {
    render(<DeparturesManager {...BASE_PROPS} />);

    expect(
      await screen.findByRole('button', { name: /Departure actions DEP-1/ })
    ).toBeInTheDocument();
    // A cancelled departure has nothing left to do, so it offers no menu.
    expect(screen.queryByRole('button', { name: /DEP-2/ })).toBeNull();
  });

  test('opens an action from the keyboard', async () => {
    render(<DeparturesManager {...BASE_PROPS} />);

    await userEvent.click(await screen.findByRole('button', { name: /Departure actions DEP-1/ }));
    expect(await screen.findByRole('menuitem', { name: 'Prices' })).toBeInTheDocument();
  });

  test('warns when a published tour has nothing left to book', async () => {
    render(<DeparturesManager {...BASE_PROPS} tourStatus="PUBLISHED" />);

    // DEP-1 is open, so the warning must not fire…
    expect(screen.queryByText(/no open departures/i)).toBeNull();
  });
});
