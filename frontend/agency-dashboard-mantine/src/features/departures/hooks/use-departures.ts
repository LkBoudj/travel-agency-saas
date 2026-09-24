import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  requestCancelDeparture,
  requestCreateDeparture,
  requestDepartures,
  requestUpdateDeparture,
} from '../api/departures.api.ts';
import { departuresQueryKeys } from '../queries/departures.queries.ts';
import type { DepartureFormValues } from '../schemas/departure.schema.ts';
import type { DepartureStatus } from '../types.ts';

/** The departures of one tour. Disabled until a tour is selected. */
export function useDepartures(tourCode: string | undefined, status?: DepartureStatus) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: departuresQueryKeys.list(code, tourCode ?? '', status),
    queryFn: () => requestDepartures(code, tourCode ?? '', status),
    enabled: Boolean(tourCode),
    staleTime: 30_000,
  });
}

/**
 * Departure mutations. Each invalidates only this tour's departures slice —
 * never another agency's, and never the tour itself (a departure change does
 * not reshape the tour aggregate).
 */
export function useDeparturesMutations(tourCode: string) {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: departuresQueryKeys.all(code, tourCode) });

  const create = useMutation({
    mutationFn: ({ values }: { values: DepartureFormValues }) =>
      requestCreateDeparture(code, tourCode, values),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      departureCode,
      values,
      status,
    }: {
      departureCode: string;
      values: DepartureFormValues;
      status: DepartureStatus;
    }) => requestUpdateDeparture(code, tourCode, departureCode, values, status),
    onSuccess: invalidate,
  });

  /** One-way: OPEN/CLOSED → CANCELLED. The tour status is never touched. */
  const cancel = useMutation({
    mutationFn: ({ departureCode }: { departureCode: string }) =>
      requestCancelDeparture(code, tourCode, departureCode),
    onSuccess: invalidate,
  });

  return { create, update, cancel };
}
