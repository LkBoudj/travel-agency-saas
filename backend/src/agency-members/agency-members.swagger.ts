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

export const MEMBER_CANDIDATE_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'USR-3F2A91C7B4D0' },
    firstName: { type: 'string', nullable: true, example: 'Ahmed' },
    lastName: { type: 'string', nullable: true, example: 'Ali' },
    email: { type: 'string', example: 'ahmed@example.com' },
    status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
    alreadyMember: {
      type: 'boolean',
      description: 'Whether this account is already a member of THIS agency.',
      example: false,
    },
  },
};

const EXISTING_MEMBER_SCHEMA = {
  type: 'object',
  required: ['type', 'appUserCode'],
  description: 'An account that already exists becomes an employee.',
  properties: {
    type: { type: 'string', enum: ['EXISTING'], example: 'EXISTING' },
    appUserCode: {
      type: 'string',
      maxLength: 24,
      example: 'USR-3F2A91C7B4D0',
      description:
        'Code of an existing ACTIVE account, obtained from member-candidates. Membership in ' +
        'another agency is not a conflict.',
    },
  },
};

const NEW_MEMBER_SCHEMA = {
  type: 'object',
  required: ['type', 'email', 'password'],
  description:
    'The account is created in the same transaction as the membership and receives NO platform ' +
    'role: its only context is this agency.',
  properties: {
    type: { type: 'string', enum: ['NEW'], example: 'NEW' },
    email: { type: 'string', format: 'email', example: 'ahmed@example.com' },
    password: { type: 'string', minLength: 8, maxLength: 72, example: 'a-strong-password' },
    firstName: { type: 'string', nullable: true, example: 'Ahmed' },
    lastName: { type: 'string', nullable: true, example: 'Ali' },
  },
};

const ROLE_KEYS_SCHEMA = {
  type: 'array',
  description:
    'Agency role keys to assign. Optional and may be empty: `membershipType = EMPLOYEE` already ' +
    'classifies the person, so no placeholder role is invented.',
  items: { type: 'string', example: 'AGENCY_BOOKING_AGENT' },
};

export const ADD_MEMBER_BODY_SCHEMA = {
  type: 'object',
  required: ['member'],
  properties: {
    member: {
      description: 'Discriminated on `type`.',
      oneOf: [EXISTING_MEMBER_SCHEMA, NEW_MEMBER_SCHEMA],
      discriminator: { propertyName: 'type' },
    },
    roleKeys: ROLE_KEYS_SCHEMA,
  },
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
