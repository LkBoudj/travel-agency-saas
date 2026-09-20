const CUSTOMER_CODE_SCHEMA = {
  type: 'string',
  example: 'CUS-3F2A91C7B4D0',
};

export const CUSTOMER_CODE_PARAM_DOC = {
  name: 'customerCode',
  description: 'The customer’s public code',
  example: 'CUS-3F2A91C7B4D0',
};

export const CUSTOMER_SCHEMA = {
  type: 'object',
  properties: {
    code: CUSTOMER_CODE_SCHEMA,
    firstName: { type: 'string', nullable: true, example: 'Sara' },
    lastName: { type: 'string', nullable: true, example: 'Haddad' },
    email: { type: 'string', nullable: true, example: 'sara@example.com' },
    phone: { type: 'string', nullable: true, example: '+961 3 123 456' },
    notes: { type: 'string', nullable: true, example: 'Prefers WhatsApp.' },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'ARCHIVED'],
      description:
        'ARCHIVED records are excluded from listings. Archive is one-way for now — there is no restore.',
      example: 'ACTIVE',
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-09-19T10:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-09-19T10:00:00.000Z' },
  },
};

const CONTACT_FIELD_SCHEMAS = {
  firstName: { type: 'string', nullable: true, example: 'Sara' },
  lastName: { type: 'string', nullable: true, example: 'Haddad' },
  email: { type: 'string', nullable: true, example: 'sara@example.com' },
  phone: { type: 'string', nullable: true, example: '+961 3 123 456' },
  notes: { type: 'string', nullable: true, example: 'Prefers WhatsApp.' },
};

export const CREATE_CUSTOMER_BODY_SCHEMA = {
  type: 'object',
  properties: CONTACT_FIELD_SCHEMAS,
  description:
    'Every field is optional: a customer may be a bare name, a bare phone, or anything in ' +
    'between. An empty string is stored as no value.',
};

export const UPDATE_CUSTOMER_BODY_SCHEMA = {
  type: 'object',
  properties: CONTACT_FIELD_SCHEMAS,
  description:
    'Partial update: omitted fields are left untouched; `null` (or an empty string) clears a ' +
    'field.',
};