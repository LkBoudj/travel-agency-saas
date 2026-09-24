import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  requestAddTraveler,
  requestBookings,
  requestCancelBooking,
  requestConfirmBooking,
  requestCreateBooking,
  requestUpdateTraveler,
} from '../api/bookings.api.ts';
import { bookingsQueryKeys } from '../queries/bookings.queries.ts';
import type { BookingStatus, CreateBookingPayload, TravelerWritePayload } from '../types.ts';

/**
 * The booking list for the agency, filtered by the backend.
 *
 * Searching and status-filtering are server concerns here: filtering a partial
 * client list would quietly hide bookings the server would have matched. The
 * backend returns every status; cancelled ones stay listed so their history is
 * reachable.
 */
export function useBookings(search = '', status?: BookingStatus) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: bookingsQueryKeys.list(code, search.trim(), status),
    queryFn: () => requestBookings(code, search, status),
    staleTime: 30_000,
  });
}

/**
 * Booking mutations.
 *
 * Every mutation invalidates the same narrow slice: this agency's booking
 * queries and nothing else. The prefix also covers the detail and travelers
 * keys of every booking in the agency, so a confirmation is reflected in the
 * list page, the details page and any open traveler cards. Seats are not
 * mirrored onto tour/departure queries: departures stay read-only here and
 * the backend owns capacity, so there is nothing derived client-side to
 * refresh.
 */
export function useBookingMutations() {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.all(code) });

  const create = useMutation({
    mutationFn: (payload: CreateBookingPayload) => requestCreateBooking(code, payload),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: ({ bookingCode, reason }: { bookingCode: string; reason: string | null }) =>
      requestCancelBooking(code, bookingCode, reason),
    onSuccess: invalidate,
  });

  const confirm = useMutation({
    mutationFn: ({ bookingCode }: { bookingCode: string }) =>
      requestConfirmBooking(code, bookingCode),
    onSuccess: invalidate,
  });

  const addTraveler = useMutation({
    mutationFn: ({
      bookingCode,
      payload,
    }: {
      bookingCode: string;
      payload: TravelerWritePayload;
    }) => requestAddTraveler(code, bookingCode, payload),
    onSuccess: invalidate,
  });

  const updateTraveler = useMutation({
    mutationFn: ({
      bookingCode,
      travelerCode,
      payload,
    }: {
      bookingCode: string;
      travelerCode: string;
      payload: TravelerWritePayload;
    }) => requestUpdateTraveler(code, bookingCode, travelerCode, payload),
    onSuccess: invalidate,
  });

  return { create, cancel, confirm, addTraveler, updateTraveler };
}
