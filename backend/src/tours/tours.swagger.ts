const TOUR_CODE_SCHEMA = {
  type: 'string',
  example: 'TUR-3F2A91C7B4D0',
};

export const TOUR_CODE_PARAM_DOC = {
  name: 'tourCode',
  description: 'The tour’s public code',
  example: 'TUR-3F2A91C7B4D0',
};

const TOUR_LOCATION_PROPERTIES = {
  wilayaCode: { type: 'string', nullable: true, example: '16' },
  cityId: { type: 'string', nullable: true, example: 'Béjaïa' },
  place: { type: 'string', nullable: true, example: 'Tikjda' },
};

const TOUR_ITINERARY_DAY_PROPERTIES = {
  title: { type: 'string', example: 'Arrival in Istanbul' },
  location: { type: 'string', example: 'Istanbul' },
  description: { type: 'string', example: 'Arrival, transfer, hotel check-in.' },
};

const textItem = { type: 'object', properties: { text: { type: 'string' } } };

export const TOUR_SCHEMA = {
  type: 'object',
  properties: {
    code: TOUR_CODE_SCHEMA,
    name: { type: 'string', example: 'Tikjda Hiking Day' },
    internalRef: { type: 'string', nullable: true, example: 'TIK-1D-001' },
    status: {
      type: 'string',
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      description:
        'Lifecycle: DRAFT → PUBLISHED via the guarded publish action; ARCHIVED is one-way. ' +
        'The backend never auto-publishes.',
      example: 'DRAFT',
    },
    format: {
      type: 'string',
      enum: ['experience', 'day_excursion', 'stay', 'circuit', 'cruise'],
    },
    geographicScope: { type: 'string', enum: ['domestic', 'international'] },
    availabilityMode: { type: 'string', enum: ['scheduled', 'on_request', 'custom_quote'] },
    participationMode: {
      type: 'string',
      nullable: true,
      enum: ['shared_group', 'private', 'individual'],
    },
    guidanceType: {
      type: 'string',
      nullable: true,
      enum: ['guided', 'escorted', 'self_guided', 'mixed'],
    },
    days: { type: 'integer', nullable: true },
    nights: { type: 'integer', nullable: true },
    hours: { type: 'integer', nullable: true },
    isFlexible: { type: 'boolean' },
    minTravelers: { type: 'integer', example: 1 },
    languages: { type: 'array', items: { type: 'string' } },
    themes: { type: 'array', items: { type: 'string' } },
    activities: { type: 'array', items: { type: 'string' } },
    audiences: { type: 'array', items: { type: 'string' } },
    activityRequirements: {
      type: 'object',
      nullable: true,
      properties: {
        difficulty: { type: 'string', nullable: true, enum: ['easy', 'moderate', 'challenging'] },
        distanceKm: { type: 'number', nullable: true },
        elevationGainM: { type: 'number', nullable: true },
        minimumAge: { type: 'number', nullable: true },
        fitnessLevel: { type: 'string', nullable: true, enum: ['basic', 'normal', 'good', 'high'] },
        requiredEquipment: { type: 'string', nullable: true },
      },
    },
    transportModes: { type: 'array', items: { type: 'string' } },
    accommodationTypes: { type: 'array', items: { type: 'string' } },
    shortDescription: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    highlights: { type: 'array', items: textItem },
    itinerary: {
      type: 'array',
      items: { type: 'object', properties: TOUR_ITINERARY_DAY_PROPERTIES },
    },
    included: { type: 'array', items: textItem },
    notIncluded: { type: 'array', items: textItem },
    importantInformation: { type: 'string', nullable: true },
    cancellationPolicy: { type: 'string', nullable: true },
    meetingPoint: { type: 'string', nullable: true },
    meetingInstructions: { type: 'string', nullable: true },
    coverImageUrl: { type: 'string', nullable: true },
    gallery: {
      type: 'array',
      items: { type: 'object', properties: { url: { type: 'string' } } },
    },
    origin: { type: 'object', properties: TOUR_LOCATION_PROPERTIES },
    destinations: {
      type: 'array',
      items: { type: 'object', properties: TOUR_LOCATION_PROPERTIES },
    },
    startingPrice: {
      type: 'number',
      nullable: true,
      description: 'Minimum price among the tour’s OPEN departures, or null when none.',
      example: 96000,
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-09-20T10:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-09-20T10:00:00.000Z' },
  },
};

export const TOUR_LIST_SCHEMA = {
  type: 'object',
  properties: {
    code: TOUR_CODE_SCHEMA,
    name: { type: 'string', example: 'Tikjda Hiking Day' },
    internalRef: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
    coverImageUrl: { type: 'string', nullable: true },
    format: { type: 'string' },
    geographicScope: { type: 'string' },
    availabilityMode: { type: 'string' },
    days: { type: 'integer', nullable: true },
    nights: { type: 'integer', nullable: true },
    hours: { type: 'integer', nullable: true },
    destinations: {
      type: 'array',
      items: { type: 'object', properties: TOUR_LOCATION_PROPERTIES },
    },
    startingPrice: {
      type: 'number',
      nullable: true,
      description: 'Minimum price among the tour’s OPEN departures, or null when none.',
      example: 96000,
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const TOUR_PAYLOAD_BODY_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Tikjda Hiking Day' },
    internalRef: { type: 'string', nullable: true, example: 'TIK-1D-001' },
    format: { type: 'string', enum: ['experience', 'day_excursion', 'stay', 'circuit', 'cruise'] },
    geographicScope: { type: 'string', enum: ['domestic', 'international'] },
    availabilityMode: { type: 'string', enum: ['scheduled', 'on_request', 'custom_quote'] },
    participationMode: {
      type: 'string',
      nullable: true,
      enum: ['shared_group', 'private', 'individual'],
    },
    guidanceType: {
      type: 'string',
      nullable: true,
      enum: ['guided', 'escorted', 'self_guided', 'mixed'],
    },
    origin: { type: 'object', properties: TOUR_LOCATION_PROPERTIES },
    destinations: {
      type: 'array',
      minItems: 1,
      maxItems: 50,
      items: { type: 'object', properties: TOUR_LOCATION_PROPERTIES },
    },
    days: { type: 'integer', nullable: true },
    nights: { type: 'integer', nullable: true },
    hours: { type: 'integer', nullable: true },
    isFlexible: { type: 'boolean', default: false },
    languages: { type: 'array', items: { type: 'string' } },
    minTravelers: { type: 'integer', default: 1 },
    themes: { type: 'array', items: { type: 'string' } },
    activities: { type: 'array', items: { type: 'string' } },
    audiences: { type: 'array', items: { type: 'string' } },
    activityRequirements: { type: 'object', nullable: true },
    transportModes: { type: 'array', items: { type: 'string' } },
    accommodationTypes: { type: 'array', items: { type: 'string' } },
    shortDescription: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    highlights: { type: 'array', items: textItem },
    itinerary: {
      type: 'array',
      items: { type: 'object', properties: TOUR_ITINERARY_DAY_PROPERTIES },
    },
    included: { type: 'array', items: textItem },
    notIncluded: { type: 'array', items: textItem },
    importantInformation: { type: 'string', nullable: true },
    cancellationPolicy: { type: 'string', nullable: true },
    meetingPoint: { type: 'string', nullable: true },
    meetingInstructions: { type: 'string', nullable: true },
    coverImageUrl: { type: 'string', nullable: true },
    gallery: {
      type: 'array',
      items: { type: 'object', properties: { url: { type: 'string' } } },
    },
  },
  description:
    'The full Tour aggregate. `PUT` replaces the whole tour (destinations and ' +
    'itinerary are re-created in the same transaction). Status is moved only by ' +
    'the publish / unpublish / archive actions. Departures, prices and extras ' +
    'belong to later modules and are not part of this contract.',
};