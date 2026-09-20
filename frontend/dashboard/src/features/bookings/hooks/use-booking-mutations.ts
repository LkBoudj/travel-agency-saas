import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  bookingsQueryKeys,
  cancelBooking,
  createBooking,
} from "../api/bookings.api"
import type { CreateBookingPayload } from "../types/bookings.types"

/**
 * Every booking mutation invalidates the same narrow slice: this agency's
 * booking queries and nothing else.
 *
 * The key is prefixed with the agency code, so a change here never refetches
 * another agency's data — or the rest of the application. Seats are not
 * mirrored onto tour/departure queries: departures stay read-only here and the
 * backend owns capacity, so there is nothing derived client-side to refresh.
 */
function useInvalidateBookings(agencyCode: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: bookingsQueryKeys.all(agencyCode),
    })
}

export function useCreateBooking(agencyCode: string) {
  const invalidate = useInvalidateBookings(agencyCode)
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) =>
      createBooking(agencyCode, payload),
    onSuccess: invalidate,
  })
}

export function useCancelBooking(agencyCode: string) {
  const invalidate = useInvalidateBookings(agencyCode)
  return useMutation({
    mutationFn: (input: { bookingCode: string; reason: string | null }) =>
      cancelBooking(agencyCode, input.bookingCode, input.reason),
    onSuccess: invalidate,
  })
}