import type { TourPublishBlocker } from '../types.ts';

/**
 * Client-visible subset of the backend publish readiness gate. The server adds
 * SCHEDULED_DEPARTURES_REQUIRED (which needs the departures module), so this
 * checker is used to annotate the row action — never to gate the request.
 */
export const PUBLISH_BLOCKER_ORDER: readonly TourPublishBlocker[] = [
  'NAME',
  'DESTINATION',
  'SHORT_DESCRIPTION',
  'COVER_IMAGE',
];

export function computeTourPublishBlockers(
  tour: Pick<TourLike, 'name' | 'destinations' | 'shortDescription' | 'coverImageUrl'>
): TourPublishBlocker[] {
  const blockers: TourPublishBlocker[] = [];

  if (tour.name.trim().length === 0) {
    blockers.push('NAME');
  }

  const hasAnyDestination = tour.destinations.some(
    (destination) =>
      (destination.place?.trim().length ?? 0) > 0 ||
      (destination.cityId?.trim().length ?? 0) > 0 ||
      (destination.wilayaCode?.trim().length ?? 0) > 0
  );
  if (!hasAnyDestination) {
    blockers.push('DESTINATION');
  }

  if ((tour.shortDescription?.trim().length ?? 0) === 0) {
    blockers.push('SHORT_DESCRIPTION');
  }

  if ((tour.coverImageUrl?.trim().length ?? 0) === 0) {
    blockers.push('COVER_IMAGE');
  }

  return blockers;
}

type TourLike = {
  name: string;
  destinations: { place?: string | null; cityId?: string | null; wilayaCode?: string | null }[];
  shortDescription?: string | null;
  coverImageUrl?: string | null;
};
