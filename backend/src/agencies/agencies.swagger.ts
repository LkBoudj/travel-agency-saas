export const AGENCY_EXAMPLE = {
  code: 'AGY-ABCDEF123456',
  name: 'Sunshine Travels',
  status: 'ACTIVE',
  country: 'Morocco',
  website: 'https://sunshine-travels.example',
  memberCount: 1,
  createdAt: '2026-09-17T10:00:00.000Z',
  updatedAt: '2026-09-17T10:00:00.000Z',
};

export const AGENCY_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: AGENCY_EXAMPLE.code },
    name: { type: 'string', example: AGENCY_EXAMPLE.name },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      example: AGENCY_EXAMPLE.status,
      description: 'Platform-side agency lifecycle status.',
    },
    country: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.country },
    website: { type: 'string', nullable: true, example: AGENCY_EXAMPLE.website },
    memberCount: {
      type: 'integer',
      example: AGENCY_EXAMPLE.memberCount,
      description: 'Number of AgencyMembership rows for this agency.',
    },
    createdAt: { type: 'string', format: 'date-time', example: AGENCY_EXAMPLE.createdAt },
    updatedAt: { type: 'string', format: 'date-time', example: AGENCY_EXAMPLE.updatedAt },
  },
};
