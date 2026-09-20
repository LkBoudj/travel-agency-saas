import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  archiveTour,
  createTour,
  publishTour,
  toursQueryKeys,
  unpublishTour,
  updateTour,
} from "../api/tours.api"
import type { TourPayload } from "../types/tour.types"

/**
 * Every tour mutation invalidates the same narrow slice: this agency's tour
 * queries and nothing else.
 *
 * The key is prefixed with the agency code, so a change here never refetches
 * another agency's data — or the rest of the application.
 */
function useInvalidateTours(agencyCode: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: toursQueryKeys.all(agencyCode),
    })
}

export function useCreateTour(agencyCode: string) {
  const invalidate = useInvalidateTours(agencyCode)
  return useMutation({
    mutationFn: (payload: TourPayload) => createTour(agencyCode, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTour(agencyCode: string) {
  const invalidate = useInvalidateTours(agencyCode)
  return useMutation({
    mutationFn: (input: { tourCode: string; payload: TourPayload }) =>
      updateTour(agencyCode, input.tourCode, input.payload),
    onSuccess: invalidate,
  })
}

export function usePublishTour(agencyCode: string) {
  const invalidate = useInvalidateTours(agencyCode)
  return useMutation({
    mutationFn: (tourCode: string) => publishTour(agencyCode, tourCode),
    onSuccess: invalidate,
  })
}

export function useUnpublishTour(agencyCode: string) {
  const invalidate = useInvalidateTours(agencyCode)
  return useMutation({
    mutationFn: (tourCode: string) => unpublishTour(agencyCode, tourCode),
    onSuccess: invalidate,
  })
}

export function useArchiveTour(agencyCode: string) {
  const invalidate = useInvalidateTours(agencyCode)
  return useMutation({
    mutationFn: (tourCode: string) => archiveTour(agencyCode, tourCode),
    onSuccess: invalidate,
  })
}