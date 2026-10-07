import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { requestRecordPayment } from '../api/payments.api.ts';
import { paymentsQueryKeys } from '../queries/payments.queries.ts';
import type { RecordPaymentPayload } from '../types.ts';

/**
 * Payment mutations.
 *
 * Invalidation refreshes the specific booking ledger query and the agency payment queries.
 */
export function usePaymentMutations() {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();

  const recordPayment = useMutation({
    mutationFn: ({
      bookingCode,
      payload,
    }: {
      bookingCode: string;
      payload: RecordPaymentPayload;
    }) => requestRecordPayment(code, bookingCode, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: paymentsQueryKeys.ledger(code, variables.bookingCode),
      });
      void queryClient.invalidateQueries({
        queryKey: paymentsQueryKeys.all(code),
      });
    },
  });

  return { recordPayment };
}
