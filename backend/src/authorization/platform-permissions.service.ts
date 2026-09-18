import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Loads effective permission keys for an authenticated AppUser from the
 * database (platform role assignment -> role -> role permission -> permission.key).
 *
 * Keeps authorization database-driven: permission changes take effect without
 * reissuing the (identity-only) JWT.
 */
@Injectable()
export class PlatformPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionKeysForUser(appUserId: string): Promise<string[]> {
    const id = this.parseUserId(appUserId);
    const assignments = await this.prisma.platformRoleAssignment.findMany({
      where: { appUserId: id, role: { is: { scope: 'PLATFORM' } } },
      select: {
        role: {
          select: {
            permissions: {
              where: { permission: { is: { scope: 'PLATFORM' } } },
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });

    const keys = new Set<string>();
    for (const assignment of assignments) {
      for (const link of assignment.role.permissions) {
        keys.add(link.permission.key);
      }
    }
    return [...keys];
  }

  async assignPlatformRole(appUserId: bigint, roleId: bigint): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId }, select: { scope: true } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.scope !== 'PLATFORM') {
      throw new ConflictException('Only PLATFORM-scoped roles can be assigned through the platform path');
    }
    await this.prisma.platformRoleAssignment.upsert({
      where: { appUserId_roleId: { appUserId, roleId } },
      create: { appUserId, roleId },
      update: {},
    });
  }

  private parseUserId(appUserId: string): bigint {
    try {
      return BigInt(appUserId);
    } catch {
      throw new UnauthorizedException('Invalid user identity');
    }
  }
}