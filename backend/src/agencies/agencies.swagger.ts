export const AGENCY_OWNER_EXAMPLE = {
  code: 'USR-3F2A91C7B4D0',
  email: 'owner@sunshine-travels.example',
  firstName: 'Amina',
  lastName: 'Haddad',
  status: 'ACTIVE',
};

export const AGENCY_EXAMPLE = {
  code: 'AGY-ABCDEF123456',
  name: 'Sunshine Travels',
  status: 'ACTIVE',
  country: 'Morocco',
  description: 'Desert circuits and coastal stays.',
  owner: AGENCY_OWNER_EXAMPLE,
  membersCount: 1,
  createdAt: '2026-09-17T10:00:00.000Z',
  updatedAt: '2026-09-17T10:00:00.000Z',
};

export const AGENCY_DETAILS_EXAMPLE = {
  ...AGENCY_EXAMPLE,
  applicationId: '42',
};

const AGENCY_OWNER_SCHEMA = {
  type: 'object',
  nullable: true,
  description:
    'Derived from the OWNER membership — never stored on the agency. Identified by AppUser.code ' +
    'so the platform can navigate to the user without exposing database ids.',
  properties: {
    code: { type: 'string', example: AGENCY_OWNER_EXAMPLE.code },
    email: { type: 'string', example: AGENCY_OWNER_EXAMPLE.email },
    firstName: { type: 'string', nullable: true, example: AGENCY_OWNER_EXAMPLE.firstName },
    lastName: { type: 'string', nullable: true, example: AGENCY_OWNER_EXAMPLE.lastName },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      example: AGENCY_OWNER_EXAMPLE.status,
      description: 'AppUser identity status — not the membership status.',
    },
  },
};

const AGENCY_BASE_PROPERTIES = {
  code: { type: 'string', example: AGENCY_EXAMPLE.code },
  name: { type: 'string', example: AGENCY_EXAMPLE.name },
  status: {
    type: 'string',
    enum: ['ACTIVE', 'SUSPENDED'],
    example: AGENCY_EXAMPLE.status,
    description:
      'Platform-side agency lifecycle status. Suspending the agency suspends the BUSINESS; ' +
      'the OWNER membership always stays ACTIVE.',
  },
  country: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.country },
  description: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.description },
  owner: AGENCY_OWNER_SCHEMA,
  membersCount: {
    type: 'integer',
    example: AGENCY_EXAMPLE.membersCount,
    description: 'Derived aggregate over AgencyMembership — never a stored counter.',
  },
  createdAt: { type: 'string', format: 'date-time', example: AGENCY_EXAMPLE.createdAt },
  updatedAt: { type: 'string', format: 'date-time', example: AGENCY_EXAMPLE.updatedAt },
};

export const AGENCY_SCHEMA = {
  type: 'object',
  properties: AGENCY_BASE_PROPERTIES,
};

export const AGENCY_DETAILS_SCHEMA = {
  type: 'object',
  properties: {
    ...AGENCY_BASE_PROPERTIES,
    applicationId: {
      type: 'string',
      nullable: true,
      example: AGENCY_DETAILS_EXAMPLE.applicationId,
      description: 'The approved AgencyApplication this agency came from, when applicable.',
    },
  },
};

export const APP_USER_OPTION_SCHEMA = {
  type: 'object',
  description:
    'Safe selection data for choosing an agency owner. Never carries password material, ' +
    'role internals or database ids.',
  properties: {
    code: { type: 'string', example: AGENCY_OWNER_EXAMPLE.code },
    firstName: { type: 'string', nullable: true, example: AGENCY_OWNER_EXAMPLE.firstName },
    lastName: { type: 'string', nullable: true, example: AGENCY_OWNER_EXAMPLE.lastName },
    email: { type: 'string', example: AGENCY_OWNER_EXAMPLE.email },
    status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
  },
};

const EXISTING_OWNER_SCHEMA = {
  type: 'object',
  required: ['type', 'appUserCode'],
  description: 'An account that already exists becomes the owner.',
  properties: {
    type: { type: 'string', enum: ['EXISTING'], example: 'EXISTING' },
    appUserCode: {
      type: 'string',
      maxLength: 24,
      example: AGENCY_OWNER_EXAMPLE.code,
      description:
        'Code of an existing ACTIVE account, obtained from GET /v1/app-users/search — ' +
        'operators never type it by hand.',
    },
  },
};

const NEW_OWNER_SCHEMA = {
  type: 'object',
  required: ['type', 'email', 'password'],
  description:
    "The owner's account is created in the same transaction as the agency. It receives NO " +
    'platform role: its only context is the OWNER membership.',
  properties: {
    type: { type: 'string', enum: ['NEW'], example: 'NEW' },
    email: { type: 'string', format: 'email', example: AGENCY_OWNER_EXAMPLE.email },
    password: { type: 'string', minLength: 8, maxLength: 72, example: 'a-strong-password' },
    firstName: { type: 'string', nullable: true, example: AGENCY_OWNER_EXAMPLE.firstName },
    lastName: { type: 'string', nullable: true, example: AGENCY_OWNER_EXAMPLE.lastName },
  },
};

export const CREATE_AGENCY_BODY_SCHEMA = {
  type: 'object',
  required: ['name', 'owner'],
  properties: {
    name: { type: 'string', maxLength: 200, example: AGENCY_EXAMPLE.name },
    owner: {
      description:
        'Discriminated on `type`. The agency and its owner are always created as one ' +
        'transaction; ownership internals (membership type, canonical role, role ids) are ' +
        'backend-owned and are never accepted here.',
      oneOf: [EXISTING_OWNER_SCHEMA, NEW_OWNER_SCHEMA],
      discriminator: { propertyName: 'type' },
    },
    country: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.country },
    description: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.description },
  },
};

export const UPDATE_AGENCY_BODY_SCHEMA = {
  type: 'object',
  description: 'At least one field must be provided. Status and ownership have their own paths.',
  properties: {
    name: { type: 'string', maxLength: 200, example: AGENCY_EXAMPLE.name },
    country: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.country },
    description: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.description },
  },
};

export const SET_AGENCY_STATUS_BODY_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'SUSPENDED' },
  },
};
