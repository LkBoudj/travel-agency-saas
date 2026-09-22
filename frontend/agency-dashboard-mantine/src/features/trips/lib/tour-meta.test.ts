import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../../../services/api-error.ts';
import { computeTourPublishBlockers } from './tour-actions.ts';
import { knownDestinationPlaces, tourDestinationsSummary, tourLabel } from './tour-display.ts';
import {
  blockerActionLabelKey,
  blockerMessageKey,
  tripErrorNotificationKey,
} from './tour-error-messages.ts';
import { classifyTripError } from './tour-errors.ts';

test('classifyTripError: TOUR_NOT_FOUND', () => {
  const error = new ApiError('x', 404, 'TOUR_NOT_FOUND');
  assert.deepEqual(classifyTripError(error), { kind: 'not-found' });
});

test('classifyTripError: publish-readiness with metadata blockers', () => {
  const error = new ApiError('blocked', 409, 'TOUR_PUBLISH_READINESS_BLOCKED', {
    blockers: ['NAME', 'COVER_IMAGE', 'BOGUS'],
  });
  assert.deepEqual(classifyTripError(error), {
    kind: 'publish-blocked',
    blockers: ['NAME', 'COVER_IMAGE'],
  });
});

test('classifyTripError: publish-readiness without known blockers', () => {
  const error = new ApiError('blocked', 409, 'TOUR_PUBLISH_READINESS_BLOCKED');
  assert.deepEqual(classifyTripError(error), { kind: 'publish-blocked' });
});

test('classifyTripError: TOUR_ALREADY_ARCHIVED and fallbacks', () => {
  assert.equal(
    classifyTripError(new ApiError('x', 409, 'TOUR_ALREADY_ARCHIVED')).kind,
    'already-archived'
  );
  assert.equal(classifyTripError(new ApiError('x', 500, 'SOMETHING_ELSE')).kind, 'unknown');
  assert.equal(classifyTripError(new TypeError('network down')).kind, 'network');
});

test('error message key plumbing stays in sync', () => {
  assert.equal(tripErrorNotificationKey('network'), 'errors.network');
  assert.ok(blockerMessageKey('NAME').startsWith('trips.blockers.'));
  assert.ok(blockerActionLabelKey('DESTINATION').startsWith('trips.actions.'));
});

test('computeTourPublishBlockers: reports missing publish-ready fields', () => {
  const complete = {
    name: 'Tour',
    destinations: [{ place: 'Sahara' }],
    shortDescription: 'short',
    coverImageUrl: 'https://x/y.jpg',
  };
  assert.deepEqual(computeTourPublishBlockers(complete), []);

  assert.deepEqual(
    computeTourPublishBlockers({
      name: '',
      destinations: [{ place: '', cityId: '', wilayaCode: '' }],
      shortDescription: null,
      coverImageUrl: '  ',
    }),
    ['NAME', 'DESTINATION', 'SHORT_DESCRIPTION', 'COVER_IMAGE']
  );
});

test('tour-display helpers summarize rows', () => {
  assert.equal(tourLabel({ name: '  Camel  ' }), 'Camel');
  assert.equal(
    tourDestinationsSummary({
      destinations: [
        { place: 'Sahara', cityId: null, wilayaCode: null },
        { place: ' ', cityId: null, wilayaCode: null },
      ],
    }),
    'Sahara'
  );
});

test('knownDestinationPlaces: unique non-empty labels across tour rows', () => {
  const rows = [
    {
      destinations: [
        { place: 'Sahara', cityId: null, wilayaCode: null },
        { place: '  ', cityId: 'ALG', wilayaCode: null },
      ],
    },
    {
      destinations: [
        { place: 'Sahara', cityId: null, wilayaCode: null },
        { place: null, cityId: null, wilayaCode: '16' },
      ],
    },
    { destinations: [] },
  ];
  assert.deepEqual(knownDestinationPlaces(rows), ['Sahara', 'ALG', '16']);
});

test('knownDestinationPlaces: empty input yields no suggestions', () => {
  assert.deepEqual(knownDestinationPlaces([]), []);
});
