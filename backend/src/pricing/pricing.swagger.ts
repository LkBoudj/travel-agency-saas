import { TOUR_CODE_PARAM_DOC } from '../tours/tours.swagger.js';

export const PRICING_OPTION_CODE_PARAM_DOC = {
  name: 'optionCode',
  description: "The pricing option's public code",
  example: 'PRC-3F2A91C7B4D0',
};

export const DEPARTURE_CODE_PARAM_DOC = {
  name: 'departureCode',
  description: "The departure's public code",
  example: 'DEP-3F2A91C7B4D0',
};

const DATE_TIME = { type: 'string', format: 'date-time' } as const;

export const PRICING_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'PRC-3F2A91C7B4D0' },
    name: { type: 'string', example: 'Adult' },
    description: { type: 'string', nullable: true, example: '12 years and over' },
    basis: {
      type: 'string',
      enum: ['per_person', 'per_booking'],
      description:
        'per_person prices one traveler; per_booking prices one booking (e.g. a single-room supplement).',
      example: 'per_person',
    },
    currency: { type: 'string', example: 'DZD' },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE'],
      description:
        'A new option starts ACTIVE; deactivate is one-way. Deactivated options keep their ' +
        'stored prices but are no longer offerable on new price sets.',
      example: 'ACTIVE',
    },
    pricedDepartureCount: {
      type: 'integer',
      description: 'Number of departures carrying a stored price for this option.',
      example: 3,
    },
    createdAt: DATE_TIME,
    updatedAt: DATE_TIME,
  },
};

export const PRICING_OPTION_PAYLOAD_BODY_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Adult' },
    description: { type: 'string', nullable: true, example: '12 years and over' },
    basis: { type: 'string', enum: ['per_person', 'per_booking'] },
    currency: {
      type: 'string',
      example: 'DZD',
      description:
        'Optional, defaults to DZD. A tour keeps a single currency: a create that would mix ' +
        'currencies across the tour is a 409. Currency is immutable afterwards.',
    },
  },
  required: ['name', 'basis'],
  description:
    'The editable pricing option definition. Status is never accepted: a new option lands ' +
    'ACTIVE and only the deactivate action moves it. No tour or agency reference is accepted.',
};

export const PRICING_OPTION_UPDATE_BODY_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Adult' },
    description: { type: 'string', nullable: true, example: '12 years and over' },
    basis: { type: 'string', enum: ['per_person', 'per_booking'] },
  },
  required: ['name', 'basis'],
  description:
    'Full replacement of the editable definition. Currency is intentionally absent (fixed at ' +
    'creation) and status moves only through deactivate. A deactivated option rejects edits.',
};

const PRICE_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    pricingOptionCode: { type: 'string', example: 'PRC-3F2A91C7B4D0' },
    amount: { type: 'number', example: 96000 },
  },
  required: ['pricingOptionCode', 'amount'],
};

export const DEPARTURE_PRICE_SCHEMA = {
  type: 'object',
  properties: {
    pricingOptionCode: { type: 'string', example: 'PRC-3F2A91C7B4D0' },
    pricingOptionName: { type: 'string', example: 'Adult' },
    basis: { type: 'string', enum: ['per_person', 'per_booking'] },
    currency: { type: 'string', example: 'DZD' },
    amount: { type: 'number', example: 96000 },
    active: {
      type: 'boolean',
      description: 'Whether the option is currently ACTIVE (deactivated options keep their rows).',
      example: true,
    },
  },
};

export const DEPARTURE_PRICE_SET_SCHEMA = {
  type: 'object',
  properties: {
    departureCode: { type: 'string', example: 'DEP-3F2A91C7B4D0' },
    currency: { type: 'string', nullable: true, example: 'DZD' },
    prices: { type: 'array', items: DEPARTURE_PRICE_SCHEMA },
  },
};

export const DEPARTURE_PRICES_BODY_SCHEMA = {
  type: 'object',
  properties: {
    prices: {
      type: 'array',
      maxItems: 50,
      items: PRICE_ENTRY_SCHEMA,
    },
  },
  required: ['prices'],
  description:
    'Replaces the whole price set of one departure in one transaction. Every option code must ' +
    'belong to the same tour and be ACTIVE; amounts are positive with at most two decimal places. ' +
    'Options omitted from the payload drop out of the set.',
};

export { TOUR_CODE_PARAM_DOC };