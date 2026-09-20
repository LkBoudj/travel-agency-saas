export const MY_AGENCY_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'AGY-ABCDEF123456' },
    name: { type: 'string', example: 'Sahara Travel' },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      description: 'The agency itself. A SUSPENDED agency cannot be entered.',
      example: 'ACTIVE',
    },
    membershipType: {
      type: 'string',
      enum: ['OWNER', 'EMPLOYEE'],
      description: 'Informational only — never an authorization input.',
      example: 'OWNER',
    },
    membershipStatus: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED'],
      description: 'This membership. A SUSPENDED membership cannot be entered.',
      example: 'ACTIVE',
    },
  },
};
