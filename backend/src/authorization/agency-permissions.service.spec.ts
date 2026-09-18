import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AgencyPermissionsService,
  isRoleValidForAgency,
} from './agency-permissions.service.js';

const SAHARA_ID = 10n;
const ATLAS_ID = 20n;

const prismaMock = {
  agency: {
    findUnique: vi.fn(),
  },
};

type RoleSeed = {
  key: string;
  name?: string;
  scope?: string;
  agencyId?: bigint | null;
  permissions?: Array<{ key: string; scope?: string }>;
};

/**
 * Builds the row shape the service selects. The mock mirrors the database
 * filter that only AGENCY-scoped permissions are selected, so a PLATFORM
 * permission attached to a role simply never reaches the service.
 */
function agencyRow(options: {
  id?: bigint;
  status?: string;
  members?: Array<{
    status?: string;
    membershipType?: string;
    roles?: RoleSeed[];
  }>;
}) {
  return {
    id: options.id ?? SAHARA_ID,
    code: 'AGY-SAHARA00001',
    name: 'Sahara Travel',
    status: options.status ?? 'ACTIVE',
    members: (options.members ?? []).map((member, index) => ({
      id: BigInt(100 + index),
      membershipType: member.membershipType ?? 'EMPLOYEE',
      status: member.status ?? 'ACTIVE',
      agencyRoleAssignments: (member.roles ?? []).map((role) => ({
        role: {
          key: role.key,
          name: role.name ?? role.key,
          scope: role.scope ?? 'AGENCY',
          agencyId: role.agencyId === undefined ? null : role.agencyId,
          permissions: (role.permissions ?? [])
            .filter((permission) => (permission.scope ?? 'AGENCY') === 'AGENCY')
            .map((permission) => ({ permission: { key: permission.key } })),
        },
      })),
    })),
  };
}

describe('AgencyPermissionsService', () => {
  let service: AgencyPermissionsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AgencyPermissionsService(prismaMock as unknown as PrismaService);
  });

  // ------------------------------------------------------------ agency lookup

  it('404 AGENCY_NOT_FOUND for an unknown agency code', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(null);

    await expect(service.resolveAccess('1', 'AGY-NOPE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolves the agency from the route code, scoped to this user only', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({ members: [{ roles: [{ key: 'AGENCY_OWNER' }] }] }),
    );

    await service.resolveAccess('7', 'AGY-SAHARA00001');

    const call = prismaMock.agency.findUnique.mock.calls[0]![0];
    expect(call.where).toEqual({ code: 'AGY-SAHARA00001' });
    // The membership sub-select is narrowed to the caller: another member's
    // roles can never be read into this context.
    expect(call.select.members.where).toEqual({ appUserId: 7n });
  });

  // ------------------------------------------------------------ agency status

  it('403 AGENCY_SUSPENDED for a suspended agency, before membership is considered', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        status: 'SUSPENDED',
        members: [{ roles: [{ key: 'AGENCY_OWNER', permissions: [{ key: 'AGENCY_TOUR_VIEW' }] }] }],
      }),
    );

    await expect(
      service.resolveAccess('1', 'AGY-SAHARA00001'),
    ).rejects.toMatchObject({
      response: { statusCode: 403, errorCode: 'AGENCY_SUSPENDED' },
    });
  });

  // --------------------------------------------------------------- membership

  it('403 AGENCY_MEMBERSHIP_REQUIRED when the user has no membership', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(agencyRow({ members: [] }));

    await expect(
      service.resolveAccess('1', 'AGY-SAHARA00001'),
    ).rejects.toMatchObject({
      response: { statusCode: 403, errorCode: 'AGENCY_MEMBERSHIP_REQUIRED' },
    });
  });

  it('403 AGENCY_MEMBERSHIP_INACTIVE for a suspended membership', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        members: [
          {
            status: 'SUSPENDED',
            roles: [{ key: 'AGENCY_OWNER', permissions: [{ key: 'AGENCY_TOUR_VIEW' }] }],
          },
        ],
      }),
    );

    await expect(
      service.resolveAccess('1', 'AGY-SAHARA00001'),
    ).rejects.toMatchObject({
      response: { statusCode: 403, errorCode: 'AGENCY_MEMBERSHIP_INACTIVE' },
    });
  });

  it('allows an ACTIVE member with no roles, granting nothing', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(agencyRow({ members: [{ roles: [] }] }));

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    expect(access.permissionKeys).toEqual([]);
    expect(access.roles).toEqual([]);
  });

  // -------------------------------------------------------------- permissions

  it('unions permissions across several roles and deduplicates them', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        members: [
          {
            roles: [
              {
                key: 'AGENCY_BOOKING_AGENT',
                permissions: [{ key: 'AGENCY_BOOKING_VIEW' }, { key: 'AGENCY_CUSTOMER_VIEW' }],
              },
              {
                key: 'AGENCY_TOUR_MANAGER',
                permissions: [{ key: 'AGENCY_BOOKING_VIEW' }, { key: 'AGENCY_TOUR_VIEW' }],
              },
            ],
          },
        ],
      }),
    );

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    expect(access.permissionKeys).toEqual([
      'AGENCY_BOOKING_VIEW',
      'AGENCY_CUSTOMER_VIEW',
      'AGENCY_TOUR_VIEW',
    ]);
    expect(new Set(access.permissionKeys).size).toBe(access.permissionKeys.length);
    expect(access.roles.map((role) => role.key)).toEqual([
      'AGENCY_BOOKING_AGENT',
      'AGENCY_TOUR_MANAGER',
    ]);
  });

  it('only selects AGENCY-scoped permissions from the database', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({ members: [{ roles: [{ key: 'AGENCY_OWNER' }] }] }),
    );

    await service.resolveAccess('1', 'AGY-SAHARA00001');

    const call = prismaMock.agency.findUnique.mock.calls[0]![0];
    const permissionSelect =
      call.select.members.select.agencyRoleAssignments.select.role.select.permissions;
    expect(permissionSelect.where).toEqual({ permission: { is: { scope: 'AGENCY' } } });
  });

  // ------------------------------------------------------------------- scopes

  it('a PLATFORM role assigned to the membership contributes nothing', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        members: [
          {
            roles: [
              {
                key: 'PLATFORM_ADMIN',
                scope: 'PLATFORM',
                permissions: [{ key: 'PLATFORM_AGENCY_VIEW' }],
              },
            ],
          },
        ],
      }),
    );

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    expect(access.permissionKeys).toEqual([]);
    expect(access.roles).toEqual([]);
  });

  // ---------------------------------------------------------- tenant isolation

  it('a custom role owned by ANOTHER agency contributes nothing', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        id: SAHARA_ID,
        members: [
          {
            roles: [
              {
                key: 'ATLAS_SUPERUSER',
                agencyId: ATLAS_ID,
                permissions: [{ key: 'AGENCY_BOOKING_VIEW' }],
              },
            ],
          },
        ],
      }),
    );

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    expect(access.permissionKeys).toEqual([]);
    expect(access.roles).toEqual([]);
  });

  it('a custom role owned by THIS agency contributes normally', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        id: SAHARA_ID,
        members: [
          {
            roles: [
              {
                key: 'SAHARA_NIGHT_DESK',
                agencyId: SAHARA_ID,
                permissions: [{ key: 'AGENCY_BOOKING_VIEW' }],
              },
            ],
          },
        ],
      }),
    );

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    expect(access.permissionKeys).toEqual(['AGENCY_BOOKING_VIEW']);
  });

  it('a global agency role contributes in any agency', async () => {
    for (const agencyId of [SAHARA_ID, ATLAS_ID]) {
      prismaMock.agency.findUnique.mockResolvedValue(
        agencyRow({
          id: agencyId,
          members: [
            {
              roles: [
                { key: 'AGENCY_OWNER', agencyId: null, permissions: [{ key: 'AGENCY_TOUR_VIEW' }] },
              ],
            },
          ],
        }),
      );

      const access = await service.resolveAccess('1', 'AGY-ANY');
      expect(access.permissionKeys).toEqual(['AGENCY_TOUR_VIEW']);
    }
  });

  // -------------------------------------------------------------------- owner

  it('gives an OWNER exactly what its roles grant, with no implicit bypass', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        members: [
          {
            membershipType: 'OWNER',
            roles: [{ key: 'AGENCY_OWNER', permissions: [{ key: 'AGENCY_TOUR_VIEW' }] }],
          },
        ],
      }),
    );

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    // The canonical role happens to be the source; ownership itself adds nothing.
    expect(access.membership.membershipType).toBe('OWNER');
    expect(access.permissionKeys).toEqual(['AGENCY_TOUR_VIEW']);
  });

  it('an OWNER whose role lost a permission loses it too', async () => {
    prismaMock.agency.findUnique.mockResolvedValue(
      agencyRow({
        members: [{ membershipType: 'OWNER', roles: [{ key: 'AGENCY_OWNER', permissions: [] }] }],
      }),
    );

    const access = await service.resolveAccess('1', 'AGY-SAHARA00001');

    expect(access.permissionKeys).toEqual([]);
  });

  // ------------------------------------------------------------- multi-agency

  it('resolves the same user independently in two agencies', async () => {
    prismaMock.agency.findUnique.mockResolvedValueOnce(
      agencyRow({
        id: SAHARA_ID,
        members: [
          {
            membershipType: 'OWNER',
            roles: [{ key: 'AGENCY_OWNER', permissions: [{ key: 'AGENCY_TOUR_MANAGE' }] }],
          },
        ],
      }),
    );
    const sahara = await service.resolveAccess('1', 'AGY-SAHARA00001');

    prismaMock.agency.findUnique.mockResolvedValueOnce(
      agencyRow({
        id: ATLAS_ID,
        members: [
          {
            membershipType: 'EMPLOYEE',
            roles: [{ key: 'AGENCY_ACCOUNTANT', permissions: [{ key: 'AGENCY_PAYMENT_VIEW' }] }],
          },
        ],
      }),
    );
    const atlas = await service.resolveAccess('1', 'AGY-ATLAS000001');

    expect(sahara.permissionKeys).toEqual(['AGENCY_TOUR_MANAGE']);
    expect(atlas.permissionKeys).toEqual(['AGENCY_PAYMENT_VIEW']);
    expect(sahara.membership.membershipType).toBe('OWNER');
    expect(atlas.membership.membershipType).toBe('EMPLOYEE');
  });

  // ------------------------------------------------------------------ identity

  it('denies an unparsable identity instead of widening the query', async () => {
    await expect(service.resolveAccess('not-a-number', 'AGY-X')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.agency.findUnique).not.toHaveBeenCalled();
  });
});

describe('isRoleValidForAgency', () => {
  it('accepts a global agency role', () => {
    expect(isRoleValidForAgency({ scope: 'AGENCY', agencyId: null }, SAHARA_ID)).toBe(true);
  });

  it('accepts a custom role owned by this agency', () => {
    expect(isRoleValidForAgency({ scope: 'AGENCY', agencyId: SAHARA_ID }, SAHARA_ID)).toBe(true);
  });

  it('rejects a custom role owned by another agency', () => {
    expect(isRoleValidForAgency({ scope: 'AGENCY', agencyId: ATLAS_ID }, SAHARA_ID)).toBe(false);
  });

  it('rejects a PLATFORM role regardless of ownership', () => {
    expect(isRoleValidForAgency({ scope: 'PLATFORM', agencyId: null }, SAHARA_ID)).toBe(false);
    expect(isRoleValidForAgency({ scope: 'PLATFORM', agencyId: SAHARA_ID }, SAHARA_ID)).toBe(false);
  });
});
