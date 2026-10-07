import { act, fireEvent, render, screen } from '@test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { AgencyBooking } from '../../bookings/types.ts';
import type { PaymentsPageController } from '../hooks/use-payments-page.ts';
import type { PaymentLedger } from '../types.ts';
import { PaymentsView } from './payments-view.tsx';

const MOCK_BOOKING: AgencyBooking = {
  code: 'BKG-TEST001',
  status: 'CONFIRMED',
  customer: {
    code: 'CUS-01',
    firstName: 'Fatima',
    lastName: 'Mansouri',
  },
  tour: {
    code: 'TUR-01',
    name: 'Sahara Expedition',
  },
  departure: {
    code: 'DEP-01',
    startAt: '2026-11-01T08:00:00Z',
  },
  reservedSeats: 2,
  currency: 'DZD',
  totalAmount: 100000,
  notes: null,
  confirmedAt: '2026-10-01T10:00:00Z',
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-10-01T09:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

const MOCK_LEDGER: PaymentLedger = {
  bookingCode: 'BKG-TEST001',
  currency: 'DZD',
  totalAmount: 100000,
  paidAmount: 40000,
  remainingAmount: 60000,
  payments: [
    {
      code: 'PAY-001',
      amount: 40000,
      currency: 'DZD',
      method: 'BANK_TRANSFER',
      reference: 'WIRE-9922',
      note: 'Advance deposit',
      paidAt: '2026-10-02T14:30:00Z',
      recordedByCode: 'USR-01',
      createdAt: '2026-10-02T14:30:00Z',
    },
  ],
};

function createMockController(
  overrides: Partial<PaymentsPageController> = {}
): PaymentsPageController {
  return {
    search: { raw: '', value: '', setRaw: vi.fn() },
    bookings: [MOCK_BOOKING],
    isBookingsLoading: false,
    isBookingsError: false,
    refetchBookings: vi.fn(),
    selectedBookingCode: MOCK_BOOKING.code,
    selectedBooking: MOCK_BOOKING,
    selectBooking: vi.fn(),
    ledger: MOCK_LEDGER,
    isLedgerLoading: false,
    isLedgerError: false,
    refetchLedger: vi.fn(),
    canRecordPayment: true,
    isRecordOpen: false,
    openRecord: vi.fn(),
    closeRecord: vi.fn(),
    handleRecordPayment: vi.fn(),
    isRecording: false,
    ...overrides,
  };
}

afterEach(async () => {
  await act(async () => {
    setLocale('en');
  });
});

describe('PaymentsView', () => {
  it('renders search input and booking in the list', () => {
    const controller = createMockController();
    render(<PaymentsView {...controller} />);

    expect(
      screen.getByPlaceholderText(/Search bookings by code, customer, or tour/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('BKG-TEST001')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fatima Mansouri')[0]).toBeInTheDocument();
  });

  it('renders ledger summary and payment history table for the selected booking', () => {
    const controller = createMockController();
    render(<PaymentsView {...controller} />);

    // Summary cards
    expect(screen.getByText(/Total Amount/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Paid/i)).toBeInTheDocument();
    expect(screen.getByText(/Remaining Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Partially Paid/i)).toBeInTheDocument();

    // Payment history table
    expect(screen.getByText('PAY-001')).toBeInTheDocument();
    expect(screen.getByText('WIRE-9922')).toBeInTheDocument();
    expect(screen.getByText('Advance deposit')).toBeInTheDocument();
  });

  it('shows Record payment button when canRecordPayment is true and booking is not cancelled', () => {
    const openRecord = vi.fn();
    const controller = createMockController({
      canRecordPayment: true,
      openRecord,
    });
    render(<PaymentsView {...controller} />);

    const recordButton = screen.getByRole('button', { name: /Record payment/i });
    expect(recordButton).toBeInTheDocument();

    fireEvent.click(recordButton);
    expect(openRecord).toHaveBeenCalled();
  });

  it('hides Record payment button when canRecordPayment is false', () => {
    const controller = createMockController({
      canRecordPayment: false,
    });
    render(<PaymentsView {...controller} />);

    expect(screen.queryByRole('button', { name: /Record payment/i })).not.toBeInTheDocument();
  });

  it('hides Record payment button when booking is CANCELLED', () => {
    const controller = createMockController({
      canRecordPayment: true,
      selectedBooking: {
        ...MOCK_BOOKING,
        status: 'CANCELLED',
      },
    });
    render(<PaymentsView {...controller} />);

    expect(screen.queryByRole('button', { name: /Record payment/i })).not.toBeInTheDocument();
  });

  it('renders empty prompt when no booking is selected and loading finished', () => {
    const controller = createMockController({
      isBookingsLoading: false,
      selectedBookingCode: null,
      selectedBooking: null,
      ledger: null,
    });
    render(<PaymentsView {...controller} />);

    expect(screen.getAllByText(/Select a booking from the list/i)[0]).toBeInTheDocument();
  });

  it('does not flash empty prompt while bookings are loading', () => {
    const controller = createMockController({
      isBookingsLoading: true,
      selectedBookingCode: null,
      selectedBooking: null,
      ledger: null,
      bookings: [],
    });
    render(<PaymentsView {...controller} />);

    expect(screen.queryByText(/Select a booking from the list/i)).not.toBeInTheDocument();
  });

  it('does not display stale ledger data when ledger bookingCode does not match selectedBookingCode', () => {
    const controller = createMockController({
      selectedBookingCode: 'BKG-NEW',
      selectedBooking: { ...MOCK_BOOKING, code: 'BKG-NEW' },
      ledger: { ...MOCK_LEDGER, bookingCode: 'BKG-OLD' },
    });
    render(<PaymentsView {...controller} />);

    // Should not display old ledger summary or payments table
    expect(screen.queryByText('PAY-001')).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Amount/i)).not.toBeInTheDocument();
  });
});
