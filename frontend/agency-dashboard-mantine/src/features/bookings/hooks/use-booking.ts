import { useQuery } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { requestBooking } from '../api/bookings.api.ts';
import { bookingsQueryKeys } from '../queries/bookings.queries.ts';

/**
 * One booking by code, with its frozen price lines and status history.
 * Cancelled bookings remain readable here, so a stored link keeps working.
 */
export function useBooking(bookingCode: string | undefined) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: bookingsQueryKeys.detail(code, bookingCode ?? ''),
    queryFn: () => requestBooking(code, bookingCode ?? ''),
    enabled: Boolean(bookingCode),
    staleTime: 30_000,
  });
}
