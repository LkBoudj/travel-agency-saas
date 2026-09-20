import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import {
  createPricingOption,
  deactivatePricingOption,
  getDeparturePrices,
  getPricingOption,
  getPricingOverview,
  pricingQueryKeys,
  setDeparturePrices,
  updatePricingOption,
} from "../api/pricing.api"
import { toursQueryKeys } from "../api/tours.api"
import type {
  CreatePricingOptionPayload,
  ReplaceDeparturePricesPayload,
  UpdatePricingOptionPayload,
} from "../types/pricing.types"

/** The ACTIVE options of a tour — the ones new price sets can still use. */
export function activeOptionCount(
  options: Array<{ status: "ACTIVE" | "INACTIVE" }>
): number {
  return options.filter((option) => option.status === "ACTIVE").length
}

/** The pricing overview of one tour, scoped by the route's agency. */
export function usePricingOverview(
  agencyCode: string,
  tourCode: string | undefined
) {
  return useQuery({
    queryKey: pricingQueryKeys.overview(agencyCode, tourCode ?? ""),
    queryFn: () => getPricingOverview(agencyCode, tourCode ?? ""),
    enabled: Boolean(tourCode) && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
}

/** One pricing option by code. */
export function usePricingOption(
  agencyCode: string,
  tourCode: string,
  pricingOptionCode: string | undefined
) {
  return useQuery({
    queryKey: pricingQueryKeys.option(
      agencyCode,
      tourCode,
      pricingOptionCode ?? ""
    ),
    queryFn: () =>
      getPricingOption(agencyCode, tourCode, pricingOptionCode ?? ""),
    enabled: Boolean(pricingOptionCode),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
}

/** The stored price set of one departure. */
export function useDeparturePrices(
  agencyCode: string,
  tourCode: string,
  departureCode: string | undefined
) {
  return useQuery({
    queryKey: pricingQueryKeys.departurePrices(
      agencyCode,
      tourCode,
      departureCode ?? ""
    ),
    queryFn: () =>
      getDeparturePrices(agencyCode, tourCode, departureCode ?? ""),
    enabled: Boolean(departureCode),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
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
function useInvalidatePricing(agencyCode: string, tourCode: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: pricingQueryKeys.all(agencyCode, tourCode),
    })
}

export function useCreatePricingOption(agencyCode: string, tourCode: string) {
  const invalidate = useInvalidatePricing(agencyCode, tourCode)
  return useMutation({
    mutationFn: (payload: CreatePricingOptionPayload) =>
      createPricingOption(agencyCode, tourCode, payload),
    onSuccess: invalidate,
  })
}

export function useUpdatePricingOption(agencyCode: string, tourCode: string) {
  const invalidate = useInvalidatePricing(agencyCode, tourCode)
  return useMutation({
    mutationFn: (input: {
      pricingOptionCode: string
      payload: UpdatePricingOptionPayload
    }) =>
      updatePricingOption(
        agencyCode,
        tourCode,
        input.pricingOptionCode,
        input.payload
      ),
    onSuccess: invalidate,
  })
}

/** One-way: ACTIVE → INACTIVE. The option's stored prices are kept. */
export function useDeactivatePricingOption(
  agencyCode: string,
  tourCode: string
) {
  const invalidate = useInvalidatePricing(agencyCode, tourCode)
  return useMutation({
    mutationFn: (pricingOptionCode: string) =>
      deactivatePricingOption(agencyCode, tourCode, pricingOptionCode),
    onSuccess: invalidate,
  })
}

/** Replaces one departure's whole price set; the derived tour price follows. */
export function useSetDeparturePrices(agencyCode: string, tourCode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      departureCode: string
      payload: ReplaceDeparturePricesPayload
    }) =>
      setDeparturePrices(agencyCode, tourCode, input.departureCode, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: pricingQueryKeys.all(agencyCode, tourCode),
      })
      void queryClient.invalidateQueries({
        queryKey: toursQueryKeys.all(agencyCode),
      })
    },
  })
}