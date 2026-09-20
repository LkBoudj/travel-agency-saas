import { TOUR_CODE_PARAM_DOC } from '../tours/tours.swagger.js';

export const DEPARTURE_CODE_PARAM_DOC = {
  name: 'departureCode',
  description: "The departure's public code",
  example: 'DEP-3F2A91C7B4D0',
};

const DATE_TIME = { type: 'string', format: 'date-time' } as const;

export const DEPARTURE_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'DEP-3F2A91C7B4D0' },
    status: {
      type: 'string',
      enum: ['OPEN', 'CLOSED', 'CANCELLED'],
      description:
        'OPEN counts toward a SCHEDULED tour’s publish readiness; CLOSED and CANCELLED do not. ' +
        'A new departure starts OPEN; CANCELLED is one-way.',
      example: 'OPEN',
    },
    startAt: DATE_TIME,
    endAt: DATE_TIME,
    capacity: { type: 'integer', example: 12 },
    bookingDeadline: { ...DATE_TIME, nullable: true },
    notes: { type: 'string', nullable: true },
    createdAt: DATE_TIME,
    updatedAt: DATE_TIME,
  },
};

export const DEPARTURE_PAYLOAD_BODY_SCHEMA = {
  type: 'object',
  properties: {
    startAt: { type: 'string', format: 'date-time', example: '2026-12-20T08:00:00.000Z' },
    endAt: { type: 'string', format: 'date-time', example: '2026-12-20T18:00:00.000Z' },
    capacity: { type: 'integer', example: 12 },
    bookingDeadline: { type: 'string', format: 'date-time', nullable: true },
    notes: { type: 'string', nullable: true },
  },
  required: ['startAt', 'endAt', 'capacity'],
  description:
    'The operational fields of a departure. `endAt` must be strictly after `startAt`; a ' +
    '`bookingDeadline`, when present, must not sit after `startAt`. Creating a departure ' +
    'never publishes or changes the tour status.',
};

export const DEPARTURE_UPDATE_BODY_SCHEMA = {
  type: 'object',
  properties: {
    ...DEPARTURE_PAYLOAD_BODY_SCHEMA.properties,
    status: {
      type: 'string',
      enum: ['OPEN', 'CLOSED'],
      description: 'Movement is limited to OPEN ⇄ CLOSED; CANCELLED is set by the cancel action.',
      example: 'CLOSED',
    },
  },
  required: ['startAt', 'endAt', 'capacity', 'status'],
  description:
    'Full replacement of a departure; status may move between OPEN and CLOSED only. ' +
    'A cancelled departure cannot be edited.',
};

export { TOUR_CODE_PARAM_DOC };