import { act, render, screen } from '@test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { BookingsPageController } from '../hooks/use-bookings-page.ts';
import type { AgencyBooking } from '../types.ts';
import { BookingsView } from './bookings-view.tsx';

const BOOKING: AgencyBooking = {
  code: 'BKG-61F3CFE56950',
  status: 'CONFIRMED',
  currency: 'DZD',
  totalAmount: 48000,
  reservedSeats: 2,
  createdAt: '2026-03-04T09:00:00.000Z',
  departure: { code: 'DEP-0CF24E464D0A', startAt: '2026-10-15T09:00:00.000Z' },
  tour: { code: 'TUR-63C5B04471ED', name: 'Ghardaïa M’zab' },
  customer: { code: 'CUS-F941C9F036F2', firstName: 'Amina', lastName: 'Belaid' },
} as AgencyBooking;

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

/**
 * The view is pure composition: a controller literal is enough to prove what
 * the page hands the table and how the filter is named, without booting the
 * query layer.
 */
function controller(overrides: Partial<BookingsPageController> = {}) {
  return {
    bookings: [],
    isPending: false,
    isError: false,
    refetch: () => {},
    search: { raw: '', value: '', setRaw: () => {} },
    status: 'all',
    setStatus: () => {},
    canCreate: true,
    openCreate: () => {},
    openDetails: () => {},
    ...overrides,
  } as unknown as BookingsPageController;
}

describe('BookingsView', () => {
  test('names the filter controls, not just their placeholders', () => {
    render(<BookingsView {...controller({ bookings: [BOOKING] })} />);

    // A placeholder is not an accessible name: the search field must be
    // reachable as "Search", and the status filter must not borrow the label
    // of one of its own options ("All").
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.queryByLabelText('All')).toBeNull();
  });

  test('offers the next action when there are no bookings', () => {
    render(<BookingsView {...controller()} />);

    expect(
      screen.getByText('Bookings appear here once customers reserve seats on a departure.')
    ).toBeInTheDocument();
    // The header keeps its primary action and the empty state repeats it, so an
    // empty page still offers one obvious next step.
    expect(screen.getAllByRole('button', { name: 'New booking' })).toHaveLength(2);
  });
});
