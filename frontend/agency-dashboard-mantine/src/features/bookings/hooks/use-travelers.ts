import { useQuery } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { requestBookingsTravelers } from '../api/bookings.api.ts';
import { bookingsQueryKeys } from '../queries/bookings.queries.ts';

/**
 * The booking's traveler records, newest first. The manifest is readable at
 * any point in the booking lifecycle — after confirmation it IS the recorded
 * ticket manifest, after cancellation the historical one.
 */
export function useTravelers(bookingCode: string | undefined) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: bookingsQueryKeys.travelers(code, bookingCode ?? ''),
    queryFn: () => requestBookingsTravelers(code, bookingCode ?? ''),
    enabled: Boolean(bookingCode),
    staleTime: 30_000,
  });
}
