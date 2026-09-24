import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { toursQueryKeys } from '../../trips/queries/tours.queries.ts';
import {
  requestCreatePricingOption,
  requestDeactivatePricingOption,
  requestDeparturePrices,
  requestPricingOverview,
  requestSetDeparturePrices,
  requestUpdatePricingOption,
} from '../api/pricing.api.ts';
import type { DeparturePriceRow } from '../lib/pricing-payloads.ts';
import { pricingQueryKeys } from '../queries/pricing.queries.ts';
import type {
  PricingOptionCreateValues,
  PricingOptionEditValues,
} from '../schemas/pricing-option.schema.ts';

/** The pricing overview of one tour. Disabled until a tour is selected. */
export function usePricingOverview(tourCode: string | undefined) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: pricingQueryKeys.overview(code, tourCode ?? ''),
    queryFn: () => requestPricingOverview(code, tourCode ?? ''),
    enabled: Boolean(tourCode),
    staleTime: 30_000,
  });
}

/** The stored price set of one departure. */
export function useDeparturePrices(tourCode: string, departureCode: string | undefined) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: pricingQueryKeys.departurePrices(code, tourCode, departureCode ?? ''),
    queryFn: () => requestDeparturePrices(code, tourCode, departureCode ?? ''),
    enabled: Boolean(departureCode),
    staleTime: 30_000,
  });
}

/**
 * Pricing mutations.
 *
 * Option CRUD invalidates only this tour's pricing slice — creating or editing
 * an option carries no money yet, so `startingPrice` cannot move. Replacing a
 * departure's price set additionally invalidates the tours queries, because
 * `startingPrice` and `pricedOpenDepartureCount` are derived from exactly
 * those rows.
 */
export function usePricingMutations(tourCode: string) {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all(code, tourCode) });

  const create = useMutation({
    mutationFn: ({ values }: { values: PricingOptionCreateValues }) =>
      requestCreatePricingOption(code, tourCode, values),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      pricingOptionCode,
      values,
    }: {
      pricingOptionCode: string;
      values: PricingOptionEditValues;
    }) => requestUpdatePricingOption(code, tourCode, pricingOptionCode, values),
    onSuccess: invalidate,
  });

  /** One-way: ACTIVE → INACTIVE. The option's stored prices are kept. */
  const deactivate = useMutation({
    mutationFn: ({ pricingOptionCode }: { pricingOptionCode: string }) =>
      requestDeactivatePricingOption(code, tourCode, pricingOptionCode),
    onSuccess: invalidate,
  });

  /** Replaces one departure's whole price set; the derived tour price follows. */
  const setPrices = useMutation({
    mutationFn: ({
      departureCode,
      rows,
    }: {
      departureCode: string;
      rows: ReadonlyArray<DeparturePriceRow>;
    }) => requestSetDeparturePrices(code, tourCode, departureCode, rows),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all(code, tourCode) });
      void queryClient.invalidateQueries({ queryKey: toursQueryKeys.root(code) });
    },
  });

  return { create, update, deactivate, setPrices };
}
