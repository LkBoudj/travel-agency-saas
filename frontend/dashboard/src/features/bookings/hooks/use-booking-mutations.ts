import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  addTraveler,
  bookingsQueryKeys,
  cancelBooking,
  confirmBooking,
  createBooking,
  updateTraveler,
} from "../api/bookings.api"
import type {
  CreateBookingPayload,
  TravelerWritePayload,
} from "../types/bookings.types"

/**
 * Every booking mutation invalidates the same narrow slice: this agency's
 * booking queries and nothing else.
 *
 * The key is prefixed with the agency code, so a change here never refetches
 * another agency's data — or the rest of the application. The prefix also
 * covers the detail and travelers keys of every booking in the agency (they
 * nest under `["agency", agencyCode, "bookings"]`), so a confirmation is
 * reflected in the list page, the details page and any open traveler cards. Seats are not
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

export function useConfirmBooking(agencyCode: string) {
  const invalidate = useInvalidateBookings(agencyCode)
  return useMutation({
    mutationFn: (bookingCode: string) => confirmBooking(agencyCode, bookingCode),
    onSuccess: invalidate,
  })
}

export function useAddTraveler(agencyCode: string, bookingCode: string) {
  const invalidate = useInvalidateBookings(agencyCode)
  return useMutation({
    mutationFn: (payload: TravelerWritePayload) =>
      addTraveler(agencyCode, bookingCode, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTraveler(
  agencyCode: string,
  bookingCode: string,
  travelerCode: string
) {
  const invalidate = useInvalidateBookings(agencyCode)
  return useMutation({
    mutationFn: (payload: TravelerWritePayload) =>
      updateTraveler(agencyCode, bookingCode, travelerCode, payload),
    onSuccess: invalidate,
  })
}