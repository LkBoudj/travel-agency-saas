import { ApiError } from '../../../services/api-error.ts';
import type { TourPublishBlocker } from '../types.ts';

const KNOWN_BLOCKERS: readonly TourPublishBlocker[] = [
  'NAME',
  'DESTINATION',
  'SHORT_DESCRIPTION',
  'COVER_IMAGE',
  'SCHEDULED_DEPARTURES_REQUIRED',
];

export type TourErrorKind =
  | 'not-found'
  | 'publish-blocked'
  | 'publish-state'
  | 'already-archived'
  | 'network'
  | 'unknown';

export interface TourErrorInfo {
  kind: TourErrorKind;
  blockers?: TourPublishBlocker[];
}

export function classifyTripError(error: unknown): TourErrorInfo {
  if (!(error instanceof ApiError)) {
    return { kind: 'network' };
  }

  if (error.code === 'TOUR_NOT_FOUND') {
    return { kind: 'not-found' };
  }

  if (error.code === 'TOUR_PUBLISH_READINESS_BLOCKED') {
    const blockers = extractBlockers(error.metadata?.blockers);
    const info: TourErrorInfo = { kind: 'publish-blocked' };
    if (blockers !== undefined) {
      info.blockers = blockers;
    }
    return info;
  }

  if (error.code === 'TOUR_PUBLISH_STATE_BLOCKED') {
    return { kind: 'publish-state' };
  }

  if (error.code === 'TOUR_ALREADY_ARCHIVED') {
    return { kind: 'already-archived' };
  }

  return { kind: 'unknown' };
}

function extractBlockers(value: unknown): TourPublishBlocker[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const blockers = value.filter(
    (candidate): candidate is TourPublishBlocker =>
      typeof candidate === 'string' && KNOWN_BLOCKERS.includes(candidate as TourPublishBlocker)
  );
  return blockers.length > 0 ? blockers : undefined;
}
