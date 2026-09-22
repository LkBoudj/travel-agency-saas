import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  requestArchiveTour,
  requestCreateTour,
  requestPublishTour,
  requestTours,
  requestUnpublishTour,
  requestUpdateTour,
} from '../api/tours.api.ts';
import { toursQueryKeys } from '../queries/tours.queries.ts';
import type { TripFormValues } from '../schemas/tour.schema.ts';
import type { TourStatus } from '../types.ts';

export function useTours(search = '', status?: TourStatus) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: toursQueryKeys.list(code, search, status),
    queryFn: () => requestTours(code, search, status),
    staleTime: 30_000,
  });
}

export function useToursMutations() {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: toursQueryKeys.root(code) });

  const create = useMutation({
    mutationFn: ({ values }: { values: TripFormValues }) => requestCreateTour(code, values),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ tourCode, values }: { tourCode: string; values: TripFormValues }) =>
      requestUpdateTour(code, tourCode, values),
    onSuccess: invalidate,
  });

  const publish = useMutation({
    mutationFn: ({ tourCode }: { tourCode: string }) => requestPublishTour(code, tourCode),
    onSuccess: invalidate,
  });

  const unpublish = useMutation({
    mutationFn: ({ tourCode }: { tourCode: string }) => requestUnpublishTour(code, tourCode),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: ({ tourCode }: { tourCode: string }) => requestArchiveTour(code, tourCode),
    onSuccess: invalidate,
  });

  return { create, update, publish, unpublish, archive };
}
