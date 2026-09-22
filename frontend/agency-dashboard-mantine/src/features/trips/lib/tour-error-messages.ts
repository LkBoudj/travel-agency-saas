import type { TourPublishBlocker } from '../types.ts';
import type { TourErrorKind } from './tour-errors.ts';

export function tripErrorNotificationKey(kind: TourErrorKind): string {
  switch (kind) {
    case 'not-found':
      return 'trips.notifications.tourNotFound';
    case 'publish-blocked':
      return 'trips.notifications.publishBlocked';
    case 'publish-state':
      return 'trips.notifications.publishStateBlocked';
    case 'already-archived':
      return 'trips.notifications.alreadyArchived';
    case 'network':
      return 'errors.network';
    default:
      return 'trips.notifications.unknownError';
  }
}

export function blockerMessageKey(blocker: TourPublishBlocker): string {
  const keys: Record<TourPublishBlocker, string> = {
    NAME: 'trips.blockers.NAME',
    DESTINATION: 'trips.blockers.DESTINATION',
    SHORT_DESCRIPTION: 'trips.blockers.SHORT_DESCRIPTION',
    COVER_IMAGE: 'trips.blockers.COVER_IMAGE',
    SCHEDULED_DEPARTURES_REQUIRED: 'trips.blockers.SCHEDULED_DEPARTURES_REQUIRED',
  };
  return keys[blocker];
}

export function blockerActionLabelKey(blocker: TourPublishBlocker): string {
  const keys: Record<TourPublishBlocker, string> = {
    NAME: 'trips.actions.fillName',
    DESTINATION: 'trips.actions.chooseDestination',
    SHORT_DESCRIPTION: 'trips.actions.fillShortDescription',
    COVER_IMAGE: 'trips.actions.setCoverImage',
    SCHEDULED_DEPARTURES_REQUIRED: 'trips.actions.addDepartures',
  };
  return keys[blocker];
}
