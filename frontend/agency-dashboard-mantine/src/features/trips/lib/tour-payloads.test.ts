import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTripPayload } from './tour-payloads.ts';

const base = {
  name: '  Sahara Circuit  ',
  internalRef: '  ',
  format: 'circuit',
  geographicScope: 'domestic',
  availabilityMode: 'scheduled',
  participationMode: 'shared_group',
  guidanceType: 'guided',
  origin: { wilayaCode: '16', cityId: 'Algiers', place: '  ' },
  destinations: [{ wilayaCode: '30', cityId: '', place: 'Sahara' }],
  days: '5',
  nights: '4',
  hours: '',
  isFlexible: false,
  minTravelers: '2',
  languages: ' fr \nar ',
  themes: ['sahara_desert'],
  activities: ['camel_trek'],
  audiences: ['adventure' as never],
  transportModes: ['offroad_4x4'],
  accommodationTypes: ['camp'],
  shortDescription: '  A short pitch  ',
  description: ' Long text ',
  highlights: ' Camel \n  dunes  \n',
  included: '',
  notIncluded: '\n\n',
  itinerary: [
    { title: 'Start', location: 'Algiers', description: 'Meet & depart' },
    { title: '  ', location: '', description: '' },
  ],
  importantInformation: 'Note',
  cancellationPolicy: '',
  meetingPoint: 'Café X',
  meetingInstructions: '',
  coverImageUrl: 'https://img/c.jpg',
  gallery: 'https://img/a.jpg\n\nhttps://img/b.jpg',
  activityRequirements: {
    difficulty: 'easy',
    fitnessLevel: '',
    distanceKm: '10',
    elevationGainM: '',
    minimumAge: '',
    requiredEquipment: '  ',
  },
} as const;

test('buildTripPayload: normalizes text, lists and itinerary rows', () => {
  const payload = buildTripPayload(base);

  assert.equal(payload.name, 'Sahara Circuit');
  assert.equal(payload.internalRef, null);
  assert.equal(payload.origin.place, null);
  assert.equal(payload.origin.cityId, 'Algiers');
  assert.deepEqual(payload.destinations, [{ wilayaCode: '30', cityId: null, place: 'Sahara' }]);
  assert.deepEqual(payload.languages, ['fr', 'ar']);
  assert.deepEqual(payload.highlights, [{ text: 'Camel' }, { text: 'dunes' }]);
  assert.deepEqual(payload.included, []);
  assert.deepEqual(payload.notIncluded, []);
  assert.deepEqual(payload.gallery, [{ url: 'https://img/a.jpg' }, { url: 'https://img/b.jpg' }]);
  assert.deepEqual(payload.itinerary, [
    { title: 'Start', location: 'Algiers', description: 'Meet & depart' },
  ]);
});

test('buildTripPayload: coerces numeric strings and drops impossible values', () => {
  const payload = buildTripPayload(base);

  assert.equal(payload.days, 5);
  assert.equal(payload.nights, 4);
  assert.equal(payload.hours, null);
  assert.equal(payload.minTravelers, 2);
  assert.deepEqual(payload.activityRequirements, {
    difficulty: 'easy',
    fitnessLevel: null,
    distanceKm: 10,
    elevationGainM: null,
    minimumAge: null,
    requiredEquipment: null,
  });
});

test('buildTripPayload: maps activityRequirements to null when all empty', () => {
  const payload = buildTripPayload({
    ...base,
    activityRequirements: {
      difficulty: '',
      fitnessLevel: '',
      distanceKm: '',
      elevationGainM: '',
      minimumAge: '',
      requiredEquipment: '',
    },
  });

  assert.equal(payload.activityRequirements, null);
});

test('buildTripPayload: drops zero/blank duration values and coerces empty enums', () => {
  const payload = buildTripPayload({
    ...base,
    days: '0',
    hours: '0',
    minTravelers: '',
    participationMode: '',
    guidanceType: '  ',
    audiences: [],
  });

  assert.equal(payload.days, null);
  assert.equal(payload.hours, null);
  assert.equal(payload.minTravelers, 1);
  assert.equal(payload.participationMode, null);
  assert.equal(payload.guidanceType, null);
  assert.deepEqual(payload.audiences, []);
});
