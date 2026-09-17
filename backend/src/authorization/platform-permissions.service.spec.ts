import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlatformPermissionsService } from './platform-permissions.service.js';

const prismaMock = {
  platformRoleAssignment: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
};

describe('PlatformPermissionsService (database-driven effective permission keys)', () => {
  let service: PlatformPermissionsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new PlatformPermissionsService(prismaMock as unknown as PrismaService);
  });

  it('loads distinct permission.key values from the user PLATFORM role assignments', async () => {
    prismaMock.platformRoleAssignment.findMany.mockResolvedValue([
      {
        role: {
          scope: 'PLATFORM',
          permissions: [
            { permission: { key: 'PLATFORM_USER_VIEW' } },
            { permission: { key: 'PLATFORM_USER_CREATE' } },
          ],
        },
      },
      {
        role: {
          scope: 'PLATFORM',
          permissions: [
            { permission: { key: 'PLATFORM_USER_VIEW' } },
            { permission: { key: 'PLATFORM_ROLE_VIEW' } },
          ],
        },
      },
    ]);

    const keys = await service.getPermissionKeysForUser('1');

    expect(keys).toEqual(
      expect.arrayContaining([
        'PLATFORM_USER_VIEW',
        'PLATFORM_USER_CREATE',
        'PLATFORM_ROLE_VIEW',
      ]),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(prismaMock.platformRoleAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appUserId: 1n, role: { is: { scope: 'PLATFORM' } } },
      }),
    );
  });

  it('filters permission rows by PLATFORM scope in the same query (defense in depth)', async () => {
    prismaMock.platformRoleAssignment.findMany.mockResolvedValue([]);

    await service.getPermissionKeysForUser('1');

    const query = prismaMock.platformRoleAssignment.findMany.mock.calls[0][0] as {
      select: { role: { select: { permissions: { where?: unknown } } } };
    };
    expect(query.select.role.select.permissions.where).toEqual({
      permission: { is: { scope: 'PLATFORM' } },
    });
  });

  it('never touches passwordHash or user records while loading authorization data', async () => {
    prismaMock.platformRoleAssignment.findMany.mockResolvedValue([
      { role: { scope: 'PLATFORM', permissions: [{ permission: { key: 'PLATFORM_ROLE_VIEW' } }] } },
    ]);

    const keys = await service.getPermissionKeysForUser('1');

    expect(keys.every((key) => typeof key === 'string')).toBe(true);
    expect(keys).not.toContain('passwordHash');
    expect(prismaMock.platformRoleAssignment.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.anything() }),
    );
  });

  it('rejects a non-numeric user id with UnauthorizedException', async () => {
    await expect(service.getPermissionKeysForUser('not-an-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('assigns a PLATFORM role and creates the platform role assignment', async () => {
    prismaMock.role.findUnique.mockResolvedValue({ id: 17n, scope: 'PLATFORM' });
    prismaMock.platformRoleAssignment.upsert.mockResolvedValue({});

    await service.assignPlatformRole(3n, 17n);

    expect(prismaMock.platformRoleAssignment.upsert).toHaveBeenCalledWith({
      where: { appUserId_roleId: { appUserId: 3n, roleId: 17n } },
      create: { appUserId: 3n, roleId: 17n },
      update: {},
    });
  });

  it('refuses to assign an AGENCY-scoped role through the platform path', async () => {
    prismaMock.role.findUnique.mockResolvedValue({ id: 99n, scope: 'AGENCY' });

    await expect(service.assignPlatformRole(3n, 99n)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prismaMock.platformRoleAssignment.upsert).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the role does not exist', async () => {
    prismaMock.role.findUnique.mockResolvedValue(null);

    await expect(service.assignPlatformRole(3n, 404n)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});