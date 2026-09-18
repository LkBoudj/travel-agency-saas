export const AGENCY_APPLICATION_EXAMPLE = {
  id: '42',
  agencyName: 'Sunshine Travels',
  country: 'Morocco',
  website: 'https://sunshine-travels.example',
  description: 'Boutique travel agency specializing in desert tours.',
  status: 'PENDING',
  reviewNote: null,
  applicant: {
    code: 'USR-ABCDEF123456',
    email: 'owner@agency.example',
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
  reviewedBy: null,
  reviewedAt: null,
  agency: null,
  approvedAt: null,
  createdAt: '2026-09-17T09:00:00.000Z',
  updatedAt: '2026-09-17T09:00:00.000Z',
};

export const AGENCY_APPLICATION_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      example: AGENCY_APPLICATION_EXAMPLE.id,
      description: 'Opaque string reference to the application (serialized BigInt)',
    },
    agencyName: { type: 'string', example: AGENCY_APPLICATION_EXAMPLE.agencyName },
    country: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.country },
    website: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.website },
    description: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.description },
    status: {
      type: 'string',
      enum: ['PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      example: AGENCY_APPLICATION_EXAMPLE.status,
      description:
        'Lifecycle owned by the backend. Applications are permanent audit records: ' +
        'approval links them to the created agency instead of converting them.',
    },
    reviewNote: {
      type: 'string',
      nullable: true,
      example: AGENCY_APPLICATION_EXAMPLE.reviewNote,
      description: 'Platform review note (needs-info request or rejection reason)',
    },
    applicant: {
      type: 'object',
      description: 'Derived from the JWT at submission time; never client-supplied.',
      properties: {
        code: { type: 'string', example: AGENCY_APPLICATION_EXAMPLE.applicant.code },
        email: { type: 'string', format: 'email', example: AGENCY_APPLICATION_EXAMPLE.applicant.email },
        firstName: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.applicant.firstName },
        lastName: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.applicant.lastName },
      },
    },
    reviewedBy: {
      type: 'object',
      nullable: true,
      description: 'Platform admin who performed the latest review action.',
      properties: {
        code: { type: 'string', example: AGENCY_APPLICATION_EXAMPLE.applicant.code },
        email: { type: 'string', format: 'email', example: AGENCY_APPLICATION_EXAMPLE.applicant.email },
        firstName: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.applicant.firstName },
        lastName: { type: 'string', nullable: true, example: AGENCY_APPLICATION_EXAMPLE.applicant.lastName },
      },
    },
    reviewedAt: { type: 'string', format: 'date-time', nullable: true },
    agency: {
      type: 'object',
      nullable: true,
      description: 'Set on approval: the agency created from this application.',
      properties: {
        code: { type: 'string', example: 'AGY-ABCDEF123456' },
        name: { type: 'string', example: 'Sunshine Travels' },
        status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
      },
    },
    approvedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time', example: AGENCY_APPLICATION_EXAMPLE.createdAt },
    updatedAt: { type: 'string', format: 'date-time', example: AGENCY_APPLICATION_EXAMPLE.updatedAt },
  },
};

export const CREATE_AGENCY_APPLICATION_BODY_SCHEMA = {
  type: 'object',
  required: ['agencyName'],
  properties: {
    agencyName: { type: 'string', minLength: 1, maxLength: 200, example: AGENCY_APPLICATION_EXAMPLE.agencyName },
    country: { type: 'string', nullable: true, maxLength: 100, example: AGENCY_APPLICATION_EXAMPLE.country },
    website: { type: 'string', nullable: true, maxLength: 255, example: AGENCY_APPLICATION_EXAMPLE.website },
    description: { type: 'string', nullable: true, maxLength: 5000, example: AGENCY_APPLICATION_EXAMPLE.description },
  },
  description:
    'The applicant identity, application status, review metadata and the created agency ' +
    'are backend-owned; they are rejected if present.',
};

export const REQUEST_INFO_BODY_SCHEMA = {
  type: 'object',
  required: ['reviewNote'],
  properties: {
    reviewNote: {
      type: 'string',
      minLength: 1,
      maxLength: 5000,
      example: 'Please provide your business registration number and a contact phone.',
    },
  },
};

export const REJECT_BODY_SCHEMA = {
  type: 'object',
  required: ['reviewNote'],
  properties: {
    reviewNote: {
      type: 'string',
      minLength: 1,
      maxLength: 5000,
      example: 'Incomplete business details; please reapply with registration documents.',
    },
  },
};

export const LIST_AGENCY_APPLICATIONS_QUERY_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
    },
    search: { type: 'string', maxLength: 100, example: 'sunshine' },
  },
};
