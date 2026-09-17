import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPermissionResponse, toRoleResponse } from './rbac-serializers.js';
import type { CreateRoleBody, UpdateRoleBody } from './rbac.schemas.js';
import type {
  PermissionResponse,
  ReplaceRolePermissionsResponse,
  RoleResponse,
} from './rbac.types.js';

const PLATFORM_SCOPE = 'PLATFORM';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<RoleResponse[]> {
    const roles = await this.prisma.role.findMany({
      where: { scope: PLATFORM_SCOPE },
      orderBy: { name: 'asc' },
    });
    return roles.map(toRoleResponse);
  }

  async getById(rawId: string): Promise<RoleResponse> {
    return toRoleResponse(await this.requirePlatformRole(rawId));
  }

  async create(input: CreateRoleBody): Promise<RoleResponse> {
    try {
      const role = await this.prisma.role.create({
        data: {
          name: input.name,
          scope: PLATFORM_SCOPE,
          agencyId: null,
          description: input.description ?? null,
        },
      });
      return toRoleResponse(role);
    } catch (error) {
      this.throwNameScopeConflict(error);
    }
  }

  async update(rawId: string, input: UpdateRoleBody): Promise<RoleResponse> {
    const id = this.parseRoleId(rawId);
    await this.ensurePlatformRoleExists(id);

    const data: Prisma.RoleUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;

    try {
      const role = await this.prisma.role.update({ where: { id }, data });
      return toRoleResponse(role);
    } catch (error) {
      this.throwNameScopeConflict(error);
    }
  }

  async remove(rawId: string): Promise<void> {
    const id = this.parseRoleId(rawId);
    await this.ensurePlatformRoleExists(id);

    const assignmentCount = await this.prisma.platformRoleAssignment.count({
      where: { roleId: id },
    });
    if (assignmentCount > 0) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Cannot delete a role that still has platform assignments',
        errorCode: 'ROLE_HAS_PLATFORM_ASSIGNMENTS',
      });
    }

    await this.prisma.role.delete({ where: { id } });
  }

  async listAvailablePermissions(): Promise<PermissionResponse[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { scope: PLATFORM_SCOPE },
      orderBy: { key: 'asc' },
    });
    return permissions.map(toPermissionResponse);
  }

  async getRolePermissionKeys(rawId: string): Promise<string[]> {
    const role = await this.requirePlatformRole(rawId);

    const links = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id, permission: { is: { scope: role.scope } } },
      select: { permission: { select: { key: true } } },
    });
    return links.map((link) => link.permission.key).sort();
  }

  async replaceRolePermissions(
    rawId: string,
    permissionKeys: string[],
  ): Promise<ReplaceRolePermissionsResponse> {
    const role = await this.requirePlatformRole(rawId);
    const id = role.id;

    const uniqueKeys = [...new Set(permissionKeys)];
    const finalKeys = uniqueKeys.slice().sort();

    await this.prisma.$transaction(async (tx) => {
      if (uniqueKeys.length > 0) {
        const found = await tx.permission.findMany({
          where: { key: { in: uniqueKeys } },
          select: { id: true, key: true, scope: true },
        });
        const foundByKey = new Map(found.map((permission) => [permission.key, permission]));

        const unknownKeys = uniqueKeys.filter((key) => !foundByKey.has(key));
        if (unknownKeys.length > 0) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Unknown permission keys',
            errorCode: 'UNKNOWN_PERMISSION_KEYS',
            unknownKeys,
          });
        }

        // A role may only receive permissions of its own scope: PLATFORM roles
        // take PLATFORM permissions, AGENCY roles take AGENCY permissions.
        const crossScopeKeys = uniqueKeys.filter(
          (key) => foundByKey.get(key)?.scope !== role.scope,
        );
        if (crossScopeKeys.length > 0) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Permissions must belong to the same scope as the role',
            errorCode: 'CROSS_SCOPE_PERMISSION_KEYS',
            crossScopeKeys,
          });
        }

        const permissionIds = uniqueKeys.map((key) => foundByKey.get(key)!.id);
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      } else {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
      }
    });

    return { roleId: rawId, permissionKeys: finalKeys };
  }

  private async requirePlatformRole(rawId: string) {
    const id = this.parseRoleId(rawId);
    const role = await this.prisma.role.findFirst({ where: { id, scope: PLATFORM_SCOPE } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  private async ensurePlatformRoleExists(id: bigint): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id, scope: PLATFORM_SCOPE },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
  }

  private parseRoleId(rawId: string): bigint {
    try {
      return BigInt(rawId);
    } catch {
      throw new NotFoundException('Role not found');
    }
  }

  private throwNameScopeConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({
        statusCode: 409,
        message: 'A role with this name already exists for the given scope',
        errorCode: 'ROLE_NAME_SCOPE_CONFLICT',
      });
    }
    throw error;
  }
}
