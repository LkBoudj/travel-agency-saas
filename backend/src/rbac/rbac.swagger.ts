export const ROLE_EXAMPLE = {
  id: '17',
  name: 'Content Manager',
  scope: 'PLATFORM',
  description: 'Manages public-facing roles',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
};

export const ROLE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', example: ROLE_EXAMPLE.id, description: 'Serialized BigInt id' },
    name: { type: 'string', example: ROLE_EXAMPLE.name },
    scope: { type: 'string', enum: ['PLATFORM', 'AGENCY'], example: ROLE_EXAMPLE.scope },
    description: { type: 'string', nullable: true, example: ROLE_EXAMPLE.description },
    createdAt: { type: 'string', format: 'date-time', example: ROLE_EXAMPLE.createdAt },
    updatedAt: { type: 'string', format: 'date-time', example: ROLE_EXAMPLE.updatedAt },
  },
};

export const PERMISSION_EXAMPLE = {
  key: 'PLATFORM_ROLE_VIEW',
  name: 'View platform roles',
  description: 'List and view platform roles and their permission sets',
  scope: 'PLATFORM',
  resource: 'ROLE',
  action: 'VIEW',
  createdAt: '2026-09-16T10:00:00.000Z',
};

export const PERMISSION_SCHEMA = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      example: PERMISSION_EXAMPLE.key,
      description: 'Stable identifier in the form <SCOPE>_<RESOURCE>_<ACTION>',
    },
    name: { type: 'string', example: PERMISSION_EXAMPLE.name },
    description: { type: 'string', nullable: true, example: PERMISSION_EXAMPLE.description },
    scope: {
      type: 'string',
      enum: ['PLATFORM', 'AGENCY'],
      example: PERMISSION_EXAMPLE.scope,
      description: 'Authorization scope the permission belongs to',
    },
    resource: { type: 'string', example: PERMISSION_EXAMPLE.resource },
    action: { type: 'string', example: PERMISSION_EXAMPLE.action },
    createdAt: { type: 'string', format: 'date-time', example: PERMISSION_EXAMPLE.createdAt },
  },
};
