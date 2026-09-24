import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { useDebouncedSearch } from '../../../components/search-input.tsx';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import type { AgencyBooking, BookingStatus } from '../types.ts';
import { useBookingCapabilities } from './use-booking-capabilities.ts';
import { useBookings } from './use-bookings.ts';

export interface BookingsPageController {
  bookings: AgencyBooking[];
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
  search: ReturnType<typeof useDebouncedSearch>;
  status: BookingStatus | 'all';
  setStatus: (status: BookingStatus | 'all') => void;
  canCreate: boolean;
  isCreateOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  openDetails: (booking: AgencyBooking) => void;
}

/**
 * The bookings of the current agency, newest first.
 *
 * Searching and the status filter are server concerns here — the backend
 * matches codes, customer names and tour names, and returns every status
 * unless filtered. The page has no notion of a "current agency" of its own;
 * every request is scoped by `useAgencyContext`. Permission gates are UX
 * courtesy; the backend guards stay authoritative.
 */
export function useBookingsPage(): BookingsPageController {
  const navigate = useNavigate();
  const { code } = useAgencyContext();
  const capabilities = useBookingCapabilities();
  const { raw, value, setRaw } = useDebouncedSearch();
  const [status, setStatus] = useState<BookingStatus | 'all'>('all');
  const [isCreateOpen, setCreateOpen] = useState(false);

  const bookingsQuery = useBookings(value, status === 'all' ? undefined : status);

  const openDetails = (booking: AgencyBooking) => {
    navigate(dashboardPaths.bookingsDetail(code, booking.code));
  };

  return {
    bookings: bookingsQuery.data ?? [],
    isPending: bookingsQuery.isPending,
    isFetching: bookingsQuery.isFetching,
    isError: bookingsQuery.isError,
    refetch: () => void bookingsQuery.refetch(),
    search: { raw, value, setRaw },
    status,
    setStatus,
    canCreate: capabilities.canCreate,
    isCreateOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    openDetails,
  };
}
