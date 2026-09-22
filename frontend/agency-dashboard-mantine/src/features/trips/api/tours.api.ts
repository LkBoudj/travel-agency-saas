import { apiRequest } from '../../../services/api.ts';
import { buildTripListQuery, buildTripPayload } from '../lib/tour-payloads.ts';
import type { TripFormValues } from '../schemas/tour.schema.ts';
import type { Tour, TourListRow, TourStatus } from '../types.ts';

const toursPath = (agencyCode: string) => `/v1/agencies/${encodeURIComponent(agencyCode)}/tours`;

export function requestTours(
  agencyCode: string,
  search = '',
  status?: TourStatus
): Promise<TourListRow[]> {
  return apiRequest<TourListRow[]>(`${toursPath(agencyCode)}${buildTripListQuery(search, status)}`);
}

export function requestTour(agencyCode: string, tourCode: string): Promise<Tour> {
  return apiRequest<Tour>(`${toursPath(agencyCode)}/${encodeURIComponent(tourCode)}`);
}

export function requestCreateTour(agencyCode: string, values: TripFormValues): Promise<Tour> {
  return apiRequest<Tour>(toursPath(agencyCode), {
    method: 'POST',
    body: JSON.stringify(buildTripPayload(values)),
  });
}

export function requestUpdateTour(
  agencyCode: string,
  tourCode: string,
  values: TripFormValues
): Promise<Tour> {
  return apiRequest<Tour>(`${toursPath(agencyCode)}/${encodeURIComponent(tourCode)}`, {
    method: 'PUT',
    body: JSON.stringify(buildTripPayload(values)),
  });
}

export function requestPublishTour(agencyCode: string, tourCode: string): Promise<Tour> {
  return apiRequest<Tour>(`${toursPath(agencyCode)}/${encodeURIComponent(tourCode)}/publish`, {
    method: 'POST',
  });
}

export function requestUnpublishTour(agencyCode: string, tourCode: string): Promise<Tour> {
  return apiRequest<Tour>(`${toursPath(agencyCode)}/${encodeURIComponent(tourCode)}/unpublish`, {
    method: 'POST',
  });
}

export function requestArchiveTour(agencyCode: string, tourCode: string): Promise<Tour> {
  return apiRequest<Tour>(`${toursPath(agencyCode)}/${encodeURIComponent(tourCode)}/archive`, {
    method: 'PATCH',
  });
}
