const ROLE_REF_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', example: 'AGENCY_BOOKING_AGENT' },
    name: { type: 'string', example: 'Booking Agent' },
  },
};

export const AGENCY_MEMBER_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'USR-3F2A91C7B4D0' },
    firstName: { type: 'string', nullable: true, example: 'Ahmed' },
    lastName: { type: 'string', nullable: true, example: 'Ali' },
    email: { type: 'string', example: 'ahmed@example.com' },
    accountStatus: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      description: 'Identity status across the whole product.',
      example: 'ACTIVE',
    },
    membershipType: {
      type: 'string',
      enum: ['OWNER', 'EMPLOYEE'],
      description:
        'Relationship to this agency. Informational only — never an authorization input.',
      example: 'EMPLOYEE',
    },
    membershipStatus: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      description: 'Access to THIS agency only.',
      example: 'ACTIVE',
    },
    roles: {
      type: 'array',
      description: 'Agency roles held in this agency. May be empty.',
      items: ROLE_REF_SCHEMA,
    },
    joinedAt: { type: 'string', format: 'date-time', example: '2026-09-19T10:00:00.000Z' },
  },
};

export const ASSIGNABLE_ROLE_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', example: 'AGENCY_BOOKING_AGENT' },
    name: { type: 'string', example: 'Booking Agent' },
    description: {
      type: 'string',
      nullable: true,
      example: 'Handle customers, bookings and payments',
    },
  },
};

const ROLE_KEYS_SCHEMA = {
  type: 'array',
  description:
    'Agency role keys to assign. Optional and may be empty: `membershipType = EMPLOYEE` already ' +
    'classifies the person, so no placeholder role is invented.',
  items: { type: 'string', example: 'AGENCY_BOOKING_AGENT' },
};

export const REPLACE_ROLES_BODY_SCHEMA = {
  type: 'object',
  required: ['roleKeys'],
  properties: { roleKeys: ROLE_KEYS_SCHEMA },
};

export const SET_MEMBER_STATUS_BODY_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'SUSPENDED' },
  },
};
