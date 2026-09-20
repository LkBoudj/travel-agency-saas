export const MEMBER_INVITATION_ROLE_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', example: 'AGENCY_BOOKING_AGENT' },
    name: { type: 'string', example: 'Booking Agent' },
  },
};

export const MEMBER_INVITATION_EXAMPLE = {
  code: 'INV-3F2A91C7B4D0',
  email: 'new-hire@example.com',
  status: 'PENDING',
  roles: [{ key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent' }],
  expiresAt: '2026-09-22T09:00:00.000Z',
  createdAt: '2026-09-19T09:00:00.000Z',
};

/**
 * The invitation as the agency sees it. Deliberately carries no token material
 * and no resolved-account data: `email` is the address invited, never the
 * identity behind it.
 */
export const MEMBER_INVITATION_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', maxLength: 24, example: MEMBER_INVITATION_EXAMPLE.code },
    email: { type: 'string', format: 'email', example: MEMBER_INVITATION_EXAMPLE.email },
    status: {
      type: 'string',
      enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'],
      description:
        'Lifetime status. A PENDING row past its expiry is eagerly persisted and shown as EXPIRED.',
    },
    roles: {
      type: 'array',
      items: MEMBER_INVITATION_ROLE_SCHEMA,
      description: 'The roles offered at creation time, re-filtered for this agency.',
    },
    expiresAt: { type: 'string', format: 'date-time', example: MEMBER_INVITATION_EXAMPLE.expiresAt },
    createdAt: { type: 'string', format: 'date-time', example: MEMBER_INVITATION_EXAMPLE.createdAt },
  },
};

export const CREATE_MEMBER_INVITATION_BODY_SCHEMA = {
  type: 'object',
  required: ['email'],
  description:
    'Keyed to an email address — never to an account. Unknown, existing, administrator and ' +
    'other-agency addresses all receive the same uniform response: the backend decides account ' +
    'handling only at acceptance time.',
  properties: {
    email: { type: 'string', format: 'email', example: MEMBER_INVITATION_EXAMPLE.email },
    roleKeys: {
      type: 'array',
      items: { type: 'string', example: 'AGENCY_BOOKING_AGENT' },
      maxItems: 50,
      description:
        'Agency roles offered at creation time. An empty list is valid. PLATFORM roles and ' +
        'custom roles owned by another agency are rejected.',
      default: [],
    },
  },
};

export const ACCEPT_MEMBER_INVITATION_BODY_SCHEMA = {
  type: 'object',
  description:
    'No email field exists on purpose: the email comes from the invitation. `password` is ' +
    'required only when the invited address has no account yet.',
  properties: {
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 72,
      description: 'Set only when the invited email has no account yet.',
      example: 'a-strong-password',
    },
    firstName: { type: 'string', nullable: true, maxLength: 100 },
    lastName: { type: 'string', nullable: true, maxLength: 100 },
  },
};

export const MEMBER_INVITATION_INSPECT_SCHEMA = {
  type: 'object',
  description: 'Minimal, uniform view for the token holder.',
  properties: {
    agency: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AGY-ABCDEF123456' },
        name: { type: 'string', example: 'Sunshine Travels' },
      },
    },
    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] },
    expiresAt: { type: 'string', format: 'date-time' },
  },
};

export const MEMBER_INVITATION_ACCEPT_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ACCEPTED'] },
    agency: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AGY-ABCDEF123456' },
        name: { type: 'string', example: 'Sunshine Travels' },
      },
    },
    membershipType: { type: 'string', enum: ['EMPLOYEE'] },
    membershipStatus: { type: 'string', enum: ['ACTIVE'] },
    roles: { type: 'array', items: MEMBER_INVITATION_ROLE_SCHEMA },
    joinedAt: { type: 'string', format: 'date-time' },
  },
};