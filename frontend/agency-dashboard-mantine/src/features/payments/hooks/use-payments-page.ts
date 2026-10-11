import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useDebouncedSearch } from '../../../components/search-input.tsx';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { useBookings } from '../../bookings/hooks/use-bookings.ts';
import type { AgencyBooking } from '../../bookings/types.ts';
import { buildRecordPaymentPayload } from '../lib/payment-payloads.ts';
import type { RecordPaymentFormValues } from '../schemas/payment.schema.ts';
import { useBookingPaymentLedger } from './use-booking-payment-ledger.ts';
import { usePaymentMutations } from './use-payment-mutations.ts';

export interface PaymentsPageController {
  search: ReturnType<typeof useDebouncedSearch>;
  bookings: AgencyBooking[];
  isBookingsLoading: boolean;
  isBookingsError: boolean;
  refetchBookings: () => void;
  selectedBookingCode: string | null;
  selectedBooking: AgencyBooking | null;
  selectBooking: (code: string) => void;
  ledger: ReturnType<typeof useBookingPaymentLedger>['data'] | null;
  isLedgerLoading: boolean;
  isLedgerError: boolean;
  refetchLedger: () => void;
  canRecordPayment: boolean;
  isRecordOpen: boolean;
  openRecord: () => void;
  closeRecord: () => void;
  handleRecordPayment: (values: RecordPaymentFormValues) => Promise<void>;
  isRecording: boolean;
}

export function usePaymentsPage(): PaymentsPageController {
  const { t } = useTranslation('payments');
  const { can } = useAgencyContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = useDebouncedSearch();

  const canRecordPayment = can('AGENCY_PAYMENT_RECORD');
  const [isRecordOpen, setRecordOpen] = useState(false);

  // Search bookings
  const bookingsQuery = useBookings(search.value);
  const bookings = bookingsQuery.data ?? [];

  // Selected booking code driven by URL search params as single source of truth
  const paramBookingCode = searchParams.get('booking');

  // Derive active code: URL parameter if present, or first booking when available and not searching
  const selectedBookingCode =
    paramBookingCode ?? (!search.value && bookings.length > 0 ? bookings[0].code : null);

  const selectBooking = (code: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('booking', code);
        return next;
      },
      { replace: true }
    );
  };

  const selectedBooking = bookings.find((b) => b.code === selectedBookingCode) ?? null;

  // Active booking payment ledger
  const ledgerQuery = useBookingPaymentLedger(selectedBookingCode, Boolean(selectedBookingCode));

  // Payment mutation
  const { recordPayment } = usePaymentMutations();

  const handleRecordPayment = async (values: RecordPaymentFormValues) => {
    if (!selectedBookingCode) {
      return;
    }
    try {
      const payload = buildRecordPaymentPayload(values);
      await recordPayment.mutateAsync({
        bookingCode: selectedBookingCode,
        payload,
      });
      notifications.show({
        message: t('recordDialog.success'),
        color: 'teal',
      });
      setRecordOpen(false);
    } catch {
      notifications.show({
        message: t('recordDialog.error'),
        color: 'red',
      });
    }
  };

  return {
    search,
    bookings,
    isBookingsLoading: bookingsQuery.isPending,
    isBookingsError: bookingsQuery.isError,
    refetchBookings: () => void bookingsQuery.refetch(),
    selectedBookingCode,
    selectedBooking,
    selectBooking,
    ledger: ledgerQuery.data ?? null,
    isLedgerLoading: ledgerQuery.isPending,
    isLedgerError: ledgerQuery.isError,
    refetchLedger: () => void ledgerQuery.refetch(),
    canRecordPayment,
    isRecordOpen,
    openRecord: () => setRecordOpen(true),
    closeRecord: () => setRecordOpen(false),
    handleRecordPayment,
    isRecording: recordPayment.isPending,
  };
}
