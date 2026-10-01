import { render, screen } from '@test-utils';
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { BookingDetailsPageController } from '../hooks/use-booking-details-page.ts';
import type { BookingDetail } from '../types.ts';
import { BookingDetailsView } from './booking-details-view.tsx';

vi.mock('../hooks/use-travelers.ts', () => ({
  useTravelers: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}));

beforeAll(async () => {
  await act(async () => {
    setLocale('en');
  });
});

const BOOKING = {
  code: 'BKG-1',
  status: 'CONFIRMED',
  reservedSeats: 2,
  totalAmount: 1200,
  currency: 'EUR',
  notes: null,
  confirmedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-03-04T09:00:00.000Z',
  customer: { code: 'CUS-1', firstName: 'Ada', lastName: null },
  tour: { code: 'TUR-1', name: 'Sahara' },
  departure: { code: 'DEP-1', startAt: '2026-10-15T09:00:00.000Z' },
  priceLines: [
    {
      pricingOptionCode: 'PR-1',
      pricingOptionName: 'Base',
      basis: 'per_person',
      currency: 'EUR',
      unitAmount: 600,
      quantity: 2,
      lineTotal: 1200,
    },
  ],
  statusHistory: [
    {
      fromStatus: null,
      toStatus: 'CONFIRMED',
      actorCode: null,
      reason: null,
      createdAt: '2026-03-04T09:00:00.000Z',
    },
  ],
} as unknown as BookingDetail;

function controller() {
  return {
    bookingCode: 'BKG-1',
    booking: { data: BOOKING, isPending: false, isError: false, refetch: vi.fn() },
    travelers: { data: [], isPending: false, isError: false, refetch: vi.fn() },
    capabilities: {
      traveler: { canView: true, canManage: false },
      canConfirm: false,
      canCancel: false,
    },
  } as unknown as BookingDetailsPageController;
}

function renderView() {
  return render(
    <MemoryRouter>
      <BookingDetailsView agencyCode="AGY-1" controller={controller()} />
    </MemoryRouter>
  );
}

/**
 * The section titles are the only thing telling a screen-reader user where the
 * summary ends and the price breakdown begins, so they have to be real
 * headings, not uppercase text.
 */
describe('BookingDetailsView section headings', () => {
  test('exposes each block as an h2 below the booking title', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: 'BKG-1' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /summary/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /price breakdown/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /status history/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /travelers/i })).toBeTruthy();
  });
});
