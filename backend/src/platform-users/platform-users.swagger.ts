export const PLATFORM_USER_EXAMPLE = {
  code: 'USR-ABCDEF123456',
  email: 'support.agent@mail.com',
  firstName: 'Sam',
  lastName: 'Riley',
  status: 'ACTIVE',
  roles: [{ key: 'PLATFORM_SUPPORT_AGENT', name: 'Support Agent' }],
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
};

export const PLATFORM_USER_ROLE_SCHEMA = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      example: 'PLATFORM_SUPPORT_AGENT',
      description: 'Stable role technical identifier (uppercase snake case)',
    },
    name: { type: 'string', example: 'Support Agent' },
  },
};

export const PLATFORM_USER_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: PLATFORM_USER_EXAMPLE.code },
    email: { type: 'string', format: 'email', example: PLATFORM_USER_EXAMPLE.email },
    firstName: { type: 'string', nullable: true, example: PLATFORM_USER_EXAMPLE.firstName },
    lastName: { type: 'string', nullable: true, example: PLATFORM_USER_EXAMPLE.lastName },
    status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: PLATFORM_USER_EXAMPLE.status },
    roles: {
      type: 'array',
      items: PLATFORM_USER_ROLE_SCHEMA,
      description: 'Platform Role assignments (sorted by role name)',
    },
    createdAt: { type: 'string', format: 'date-time', example: PLATFORM_USER_EXAMPLE.createdAt },
    updatedAt: { type: 'string', format: 'date-time', example: PLATFORM_USER_EXAMPLE.updatedAt },
  },
};

export const REPLACE_PLATFORM_USER_ROLES_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: PLATFORM_USER_EXAMPLE.code },
    roles: { type: 'array', items: PLATFORM_USER_ROLE_SCHEMA },
  },
};

export const CREATE_PLATFORM_USER_BODY_SCHEMA = {
  type: 'object',
  required: ['email', 'password', 'roleKeys'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email is case-insensitive (trimmed + lowercased).',
      example: 'support.agent@mail.com',
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 72,
      description: 'Never returned, logged or included in any example.',
    },
    firstName: { type: 'string', nullable: true, maxLength: 100, example: 'Sam' },
    lastName: { type: 'string', nullable: true, maxLength: 100, example: 'Riley' },
    roleKeys: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', example: 'PLATFORM_SUPPORT_AGENT' },
      description:
        'Existing PLATFORM-scoped role keys. AGENCY roles and unknown keys are rejected.',
    },
  },
};

export const UPDATE_PLATFORM_USER_BODY_SCHEMA = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'Email is case-insensitive (trimmed + lowercased).',
      example: 'support.agent@mail.com',
    },
    firstName: { type: 'string', nullable: true, maxLength: 100, example: 'Sam' },
    lastName: { type: 'string', nullable: true, maxLength: 100, example: 'Riley' },
  },
};

export const SET_PLATFORM_USER_STATUS_BODY_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      description: 'SUSPENDED denies login and invalidates existing sessions immediately.',
      example: 'SUSPENDED',
    },
  },
};

export const REPLACE_PLATFORM_USER_ROLES_BODY_SCHEMA = {
  type: 'object',
  required: ['roleKeys'],
  properties: {
    roleKeys: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', example: 'PLATFORM_SUPPORT_AGENT' },
    },
  },
};