const DATE_TIME = { type: 'string', format: 'date-time' };

const BOOKING_STATUS_ENUM = {
  type: 'string',
  enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  description:
    'PENDING holds reserved seats; CONFIRMED consumes them with confirmed travelers; ' +
    'CANCELLED is one-way and releases them. Confirmation stays readiness-gated on ' +
    'traveler records (Module J), so real bookings remain PENDING until then.',
};

const BOOKING_CUSTOMER_REF_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'CUS-3F2A91C7B4D0' },
    firstName: { type: 'string', nullable: true, example: 'Amel' },
    lastName: { type: 'string', nullable: true, example: 'Benali' },
  },
};

const BOOKING_TOUR_REF_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'TUR-3F2A91C7B4D0' },
    name: { type: 'string', example: 'Algiers by night' },
  },
};

const BOOKING_DEPARTURE_REF_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'DEP-3F2A91C7B4D0' },
    startAt: DATE_TIME,
  },
};

export const BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'BKG-3F2A91C7B4D0' },
    status: BOOKING_STATUS_ENUM,
    customer: BOOKING_CUSTOMER_REF_SCHEMA,
    tour: BOOKING_TOUR_REF_SCHEMA,
    departure: BOOKING_DEPARTURE_REF_SCHEMA,
    reservedSeats: {
      type: 'integer',
      description: 'Immutable seat claim held by this booking from creation.',
      example: 2,
    },
    currency: { type: 'string', example: 'DZD' },
    totalAmount: {
      type: 'number',
      description: 'Server-computed snapshot total (sum of the price-line totals).',
      example: 192000,
    },
    notes: { type: 'string', nullable: true },
    confirmedAt: { ...DATE_TIME, nullable: true },
    cancelledAt: { ...DATE_TIME, nullable: true },
    cancellationReason: { type: 'string', nullable: true },
    createdAt: DATE_TIME,
    updatedAt: DATE_TIME,
  },
};

const BOOKING_PRICE_LINE_SCHEMA = {
  type: 'object',
  properties: {
    pricingOptionCode: { type: 'string', example: 'PRC-3F2A91C7B4D0' },
    pricingOptionName: { type: 'string', example: 'Adult' },
    basis: { type: 'string', enum: ['per_person', 'per_booking'] },
    currency: { type: 'string', example: 'DZD' },
    unitAmount: { type: 'number', example: 96000 },
    quantity: {
      type: 'integer',
      description: 'reservedSeats for per_person lines, 1 for per_booking lines.',
      example: 2,
    },
    lineTotal: { type: 'number', example: 192000 },
  },
};

const BOOKING_STATUS_HISTORY_SCHEMA = {
  type: 'object',
  properties: {
    fromStatus: { ...BOOKING_STATUS_ENUM, nullable: true },
    toStatus: BOOKING_STATUS_ENUM,
    actorCode: { type: 'string', nullable: true, example: 'USR-3F2A91C7B4D0' },
    reason: { type: 'string', nullable: true },
    createdAt: DATE_TIME,
  },
};

export const BOOKING_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    ...BOOKING_SCHEMA.properties,
    priceLines: {
      type: 'array',
      description:
        'Immutable pricing snapshot frozen at creation; later option edits never rewrite a stored booking.',
      items: BOOKING_PRICE_LINE_SCHEMA,
    },
    statusHistory: {
      type: 'array',
      items: BOOKING_STATUS_HISTORY_SCHEMA,
    },
  },
};

export const CREATE_BOOKING_BODY_SCHEMA = {
  type: 'object',
  properties: {
    customerCode: { type: 'string', example: 'CUS-3F2A91C7B4D0' },
    departureCode: { type: 'string', example: 'DEP-3F2A91C7B4D0' },
    reservedSeats: { type: 'integer', minimum: 1, example: 2 },
    pricingSelections: {
      type: 'array',
      maxItems: 50,
      description:
        'Pricing option codes (PRC-...) with a stored price on this departure. Each code can appear once.',
      items: { type: 'string', example: 'PRC-3F2A91C7B4D0' },
      example: ['PRC-3F2A91C7B4D0'],
    },
    notes: { type: 'string', nullable: true },
  },
  required: ['customerCode', 'departureCode', 'reservedSeats'],
  description:
    "Creates a PENDING booking. The client names choices by public code only and never supplies " +
    "amounts or a total: the backend computes the snapshot from the departure's stored prices " +
    "(per_person × reservedSeats, per_booking × 1) inside a capacity-protecting transaction.",
};

export const CANCEL_BOOKING_BODY_SCHEMA = {
  type: 'object',
  properties: {
    reason: { type: 'string', nullable: true, example: 'customer changed plans' },
  },
  description: 'Cancels the booking (one-way) and releases its reserved seats.',
};

export const BOOKING_CODE_PARAM_DOC = {
  name: 'bookingCode',
  description: "The booking's public code",
  example: 'BKG-3F2A91C7B4D0',
};