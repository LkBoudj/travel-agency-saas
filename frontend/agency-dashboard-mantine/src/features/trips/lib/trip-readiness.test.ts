import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyQuickCreateFormValues } from '../schemas/quick-create.schema.ts';
import { emptyTripFormValues, type TripFormValues } from '../schemas/tour.schema.ts';
import { quickCreateToTripFormValues } from './quick-create.ts';
import { computeFormReadiness, readinessItemLabelKey } from './trip-readiness.ts';

const base = () => emptyTripFormValues();

test('computeFormReadiness: empty scheduled form reports every item missing', () => {
  const readiness = computeFormReadiness(base());
  assert.deepEqual(
    readiness.items.map((item) => item.key),
    ['name', 'destination', 'shortDescription', 'coverImage', 'openDeparture']
  );
  assert.ok(readiness.items.every((item) => !item.complete));
  assert.equal(readiness.publishable, false);
});

test('computeFormReadiness: non-scheduled tours skip the open-departure item', () => {
  const values = { ...base(), availabilityMode: 'on_request' } as const;
  const readiness = computeFormReadiness(values);
  assert.deepEqual(
    readiness.items.map((item) => item.key),
    ['name', 'destination', 'shortDescription', 'coverImage']
  );
  assert.equal(readiness.publishable, false);
});

type ReadinessValues = Pick<
  TripFormValues,
  'name' | 'destinations' | 'shortDescription' | 'coverImageUrl' | 'availabilityMode'
>;

function readinessValues(availabilityMode: TripFormValues['availabilityMode']): ReadinessValues {
  return {
    ...base(),
    availabilityMode,
    name: 'Camel Trek',
    destinations: [{ wilayaCode: '', cityId: '', place: 'Sahara' }],
    shortDescription: 'A short ride.',
    coverImageUrl: 'https://x/y.jpg',
  };
}

test('computeFormReadiness: complete form is publishable when not scheduled', () => {
  const readiness = computeFormReadiness(readinessValues('custom_quote'));
  assert.ok(readiness.items.slice(0, 4).every((item) => item.complete));
  assert.equal(readiness.publishable, true);
});

test('computeFormReadiness: scheduled tour stays unpublishable without departures', () => {
  const readiness = computeFormReadiness(readinessValues('scheduled'));
  assert.equal(readiness.items.at(-1)?.key, 'openDeparture');
  assert.equal(readiness.items.at(-1)?.complete, false);
  assert.equal(readiness.publishable, false);
});

test('readiness item labels resolve to existing blocker messages', () => {
  assert.equal(readinessItemLabelKey('name'), 'blockers.NAME');
  assert.equal(readinessItemLabelKey('openDeparture'), 'blockers.SCHEDULED_DEPARTURES_REQUIRED');
});

test('quickCreateToTripFormValues: defaults fill empty place and keep a single blank row', () => {
  const values = quickCreateToTripFormValues(emptyQuickCreateFormValues());
  assert.equal(values.name, '');
  assert.equal(values.format, 'experience');
  assert.equal(values.geographicScope, 'domestic');
  assert.equal(values.availabilityMode, 'scheduled');
  assert.deepEqual(values.destinations, [{ wilayaCode: '', cityId: '', place: '' }]);
});

test('quickCreateToTripFormValues: place lands in the destination row', () => {
  const values = quickCreateToTripFormValues({
    ...emptyQuickCreateFormValues(),
    name: '  Sahara Sunset  ',
    format: 'circuit',
    destinationPlace: '  Djanet  ',
    days: '5',
    nights: '4',
  });
  assert.equal(values.name, 'Sahara Sunset');
  assert.equal(values.format, 'circuit');
  assert.deepEqual(values.destinations, [{ wilayaCode: '', cityId: '', place: 'Djanet' }]);
  assert.equal(values.days, '5');
  assert.equal(values.nights, '4');
  assert.equal(values.hours, '');
});
