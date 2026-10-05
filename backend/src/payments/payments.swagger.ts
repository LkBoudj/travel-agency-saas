import { PAYMENT_METHODS } from './payments.schemas.js';

const DATE_TIME = { type: 'string', format: 'date-time' };

export const PAYMENT_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'PAY-3F2A91C7B4D0' },
    amount: { type: 'number', example: 50000 },
    currency: { type: 'string', example: 'DZD' },
    method: { type: 'string', enum: [...PAYMENT_METHODS], nullable: true, example: 'CASH' },
    reference: { type: 'string', nullable: true, example: 'RECEIPT-4471' },
    note: { type: 'string', nullable: true },
    paidAt: DATE_TIME,
    recordedByCode: { type: 'string', nullable: true, example: 'USR-3F2A91C7B4D0' },
    createdAt: DATE_TIME,
  },
};

export const PAYMENT_LEDGER_SCHEMA = {
  type: 'object',
  properties: {
    bookingCode: { type: 'string', example: 'BKG-3F2A91C7B4D0' },
    currency: { type: 'string', example: 'DZD' },
    totalAmount: {
      type: 'number',
      description: "The booking's frozen, server-computed total.",
      example: 120000,
    },
    paidAmount: {
      type: 'number',
      description: 'Sum of the recorded payments, computed server-side.',
      example: 50000,
    },
    remainingAmount: {
      type: 'number',
      description: 'totalAmount - paidAmount, computed server-side. Never negative.',
      example: 70000,
    },
    payments: { type: 'array', items: PAYMENT_SCHEMA },
  },
};

export const RECORD_PAYMENT_BODY_SCHEMA = {
  type: 'object',
  properties: {
    amount: {
      type: 'number',
      minimum: 0.01,
      exclusiveMinimum: true,
      maximum: 9999999999.99,
      description:
        'Money received, strictly positive with at most 2 decimal places. The currency is ' +
        'taken from the booking and cannot be sent by the client.',
      example: 50000,
    },
    method: { type: 'string', enum: [...PAYMENT_METHODS], example: 'CASH' },
    reference: {
      type: 'string',
      maxLength: 120,
      nullable: true,
      description: 'Receipt number, transfer id or cheque number.',
    },
    paidAt: {
      ...DATE_TIME,
      description: 'When the money was received. Defaults to the recording instant.',
    },
    note: { type: 'string', nullable: true },
  },
  required: ['amount'],
  description:
    'Records a manual payment against a booking. There is no gateway in the MVP: the agency ' +
    'asserts money it actually received. The paid total and the remaining balance are never ' +
    'accepted from the client — they are derived server-side from the booking total and the ' +
    'sum of the ledger.',
};

export const BOOKING_CODE_PARAM_DOC = {
  name: 'bookingCode',
  description: "The booking's public code",
  example: 'BKG-3F2A91C7B4D0',
};