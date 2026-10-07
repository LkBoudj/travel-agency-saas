import { useQuery } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { requestBookingPaymentLedger } from '../api/payments.api.ts';
import { paymentsQueryKeys } from '../queries/payments.queries.ts';

/**
 * Fetches the payment ledger for one booking.
 */
export function useBookingPaymentLedger(bookingCode: string | null, enabled = true) {
  const { code } = useAgencyContext();

  return useQuery({
    queryKey: paymentsQueryKeys.ledger(code, bookingCode ?? ''),
    queryFn: () => requestBookingPaymentLedger(code, bookingCode!),
    enabled: Boolean(code && bookingCode && enabled),
    staleTime: 15_000,
  });
}
