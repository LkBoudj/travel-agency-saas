import type { TripFormValues } from '../schemas/tour.schema.ts';
import type { TourPublishBlocker } from '../types.ts';
import { computeTourPublishBlockers } from './tour-actions.ts';

export type TripReadinessItemKey =
  | 'name'
  | 'destination'
  | 'shortDescription'
  | 'coverImage'
  | 'openDeparture';

export interface TripReadinessItem {
  key: TripReadinessItemKey;
  complete: boolean;
}

export interface TripReadiness {
  items: TripReadinessItem[];
  /** Every active item is complete — the client can safely attempt publish. */
  publishable: boolean;
}

/**
 * Live publish-readiness computed from the editor form. The first four items
 * mirror the backend gate (NAME / DESTINATION / SHORT_DESCRIPTION /
 * COVER_IMAGE). Scheduled tours additionally require an open departure, which
 * the dashboard cannot verify yet — shown only so the checklist stays honest.
 */
export function computeFormReadiness(
  values: Pick<
    TripFormValues,
    'name' | 'destinations' | 'shortDescription' | 'coverImageUrl' | 'availabilityMode'
  >
): TripReadiness {
  const blockers = computeTourPublishBlockers({
    name: values.name,
    destinations: values.destinations,
    shortDescription: values.shortDescription,
    coverImageUrl: values.coverImageUrl,
  });

  const has = (blocker: TourPublishBlocker) => !blockers.includes(blocker);

  const items: TripReadinessItem[] = [
    { key: 'name', complete: has('NAME') },
    { key: 'destination', complete: has('DESTINATION') },
    { key: 'shortDescription', complete: has('SHORT_DESCRIPTION') },
    { key: 'coverImage', complete: has('COVER_IMAGE') },
  ];

  if (values.availabilityMode === 'scheduled') {
    items.push({ key: 'openDeparture', complete: false });
  }

  return { items, publishable: items.every((item) => item.complete) };
}

const READINESS_ITEM_LABEL_KEY: Record<TripReadinessItemKey, string> = {
  name: 'blockers.NAME',
  destination: 'blockers.DESTINATION',
  shortDescription: 'blockers.SHORT_DESCRIPTION',
  coverImage: 'blockers.COVER_IMAGE',
  openDeparture: 'blockers.SCHEDULED_DEPARTURES_REQUIRED',
};

export function readinessItemLabelKey(key: TripReadinessItemKey): string {
  return READINESS_ITEM_LABEL_KEY[key];
}
