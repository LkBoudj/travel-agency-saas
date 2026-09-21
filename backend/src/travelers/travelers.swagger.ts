const DATE_TIME = { type: 'string', format: 'date-time' };

export const TRAVELER_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'TRV-3F2A91C7B4D0' },
    firstName: { type: 'string', example: 'Amel' },
    lastName: { type: 'string', example: 'Benali' },
    email: { type: 'string', nullable: true, example: 'amel@example.com' },
    phone: { type: 'string', nullable: true, example: '+213 555 12 34 56' },
    notes: { type: 'string', nullable: true },
    createdAt: DATE_TIME,
    updatedAt: DATE_TIME,
  },
};

export const ADD_TRAVELER_BODY_SCHEMA = {
  type: 'object',
  properties: {
    firstName: { type: 'string', minLength: 1, maxLength: 100, example: 'Amel' },
    lastName: { type: 'string', minLength: 1, maxLength: 100, example: 'Benali' },
    email: { type: 'string', nullable: true, example: 'amel@example.com' },
    phone: { type: 'string', maxLength: 32, nullable: true },
    notes: { type: 'string', nullable: true },
  },
  required: ['firstName', 'lastName'],
  description:
    'Adds a traveler record to a PENDING booking. Blank strings are treated as absent. ' +
    'The total number of travelers can never exceed the booking\u2019s immutable reservedSeats.',
};

export const UPDATE_TRAVELER_BODY_SCHEMA = {
  type: 'object',
  properties: {
    firstName: { type: 'string', minLength: 1, maxLength: 100, example: 'Amel' },
    lastName: { type: 'string', minLength: 1, maxLength: 100, example: 'Benali' },
    email: { type: 'string', nullable: true },
    phone: { type: 'string', maxLength: 32, nullable: true },
    notes: { type: 'string', nullable: true },
  },
  description:
    'Updates a traveler record on a PENDING booking. Omitted fields are untouched; explicit ' +
    'null (or blank) clears. At least one field is required.',
};

export const BOOKING_CODE_PARAM_DOC = {
  name: 'bookingCode',
  description: "The booking's public code",
  example: 'BKG-3F2A91C7B4D0',
};

export const TRAVELER_CODE_PARAM_DOC = {
  name: 'travelerCode',
  description: "The traveler's public code",
  example: 'TRV-3F2A91C7B4D0',
};