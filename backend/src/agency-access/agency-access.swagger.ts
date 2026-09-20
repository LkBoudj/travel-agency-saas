export const AGENCY_ACCESS_SCHEMA = {
  type: 'object',
  properties: {
    agency: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AGY-ABCDEF123456' },
        name: { type: 'string', example: 'Sahara Travel' },
        status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
      },
    },
    membership: {
      type: 'object',
      description:
        'The caller inside this agency. `membershipType` is informational only — it is never ' +
        'part of an authorization decision.',
      properties: {
        membershipType: { type: 'string', enum: ['OWNER', 'EMPLOYEE'], example: 'OWNER' },
        status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
      },
    },
    roles: {
      type: 'array',
      description: 'The AGENCY roles this membership holds that are valid for this agency.',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', example: 'AGENCY_OWNER' },
          name: { type: 'string', example: 'Agency Owner' },
        },
      },
    },
    permissions: {
      type: 'array',
      description:
        'Effective, deduplicated AGENCY permission keys. For adapting the UI only; every route ' +
        'is enforced independently on the server.',
      items: { type: 'string', example: 'AGENCY_BOOKING_VIEW' },
    },
  },
};
