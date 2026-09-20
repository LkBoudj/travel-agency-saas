import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import {
  cancelDeparture,
  createDeparture,
  departuresQueryKeys,
  getDeparture,
  listDepartures,
  updateDeparture,
} from "../api/departures.api"
import type {
  DeparturePayload,
  DepartureStatus,
  DepartureUpdatePayload,
} from "../types/departure.types"

/** The open departures of a tour — the count the publish gate needs. */
export function openDepartureCount(
  departures: Array<{ status: DepartureStatus }>
): number {
  return departures.filter((departure) => departure.status === "OPEN").length
}

/** The departures of one tour, scoped by the route's agency. */
export function useDepartures(
  agencyCode: string,
  tourCode: string | undefined
) {
  return useQuery({
    queryKey: departuresQueryKeys.all(
      agencyCode,
      tourCode ?? ""
    ),
    queryFn: () => listDepartures(agencyCode, tourCode ?? ""),
    enabled: Boolean(tourCode) && agencyCode.length > 0,
    // 401/403/404 are answers, not transient failures.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
}

/** One departure by code. */
export function useDeparture(
  agencyCode: string,
  tourCode: string,
  departureCode: string | undefined
) {
  return useQuery({
    queryKey: departuresQueryKeys.detail(
      agencyCode,
      tourCode,
      departureCode ?? ""
    ),
    queryFn: () => getDeparture(agencyCode, tourCode, departureCode ?? ""),
    enabled: Boolean(departureCode),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
}

/**
 * Departure mutations. Each invalidates only this tour's departures slice —
 * never another agency's, and never the tour itself (a departure change does
 * not reshape the tour aggregate).
 */
function useInvalidateDepartures(agencyCode: string, tourCode: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: departuresQueryKeys.all(agencyCode, tourCode),
    })
}

export function useCreateDeparture(agencyCode: string, tourCode: string) {
  const invalidate = useInvalidateDepartures(agencyCode, tourCode)
  return useMutation({
    mutationFn: (payload: DeparturePayload) =>
      createDeparture(agencyCode, tourCode, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateDeparture(agencyCode: string, tourCode: string) {
  const invalidate = useInvalidateDepartures(agencyCode, tourCode)
  return useMutation({
    mutationFn: (input: { departureCode: string; payload: DepartureUpdatePayload }) =>
      updateDeparture(agencyCode, tourCode, input.departureCode, input.payload),
    onSuccess: invalidate,
  })
}

/** One-way: OPEN/CLOSED → CANCELLED. The tour status is never touched. */
export function useCancelDeparture(agencyCode: string, tourCode: string) {
  const invalidate = useInvalidateDepartures(agencyCode, tourCode)
  return useMutation({
    mutationFn: (departureCode: string) =>
      cancelDeparture(agencyCode, tourCode, departureCode),
    onSuccess: invalidate,
  })
}