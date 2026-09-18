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
  RoleScope,
} from './rbac.types.js';

/**
 * Manages the two Platform-Admin-owned role kinds:
 *
 *   scope=PLATFORM, agencyId=null  -> Platform Role
 *   scope=AGENCY,   agencyId=null  -> Global Agency Role
 *
 * Custom Agency roles (scope=AGENCY with a non-null agencyId) are Group 2 and
 * are never matched by these queries.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(scope: RoleScope): Promise<RoleResponse[]> {
    const roles = await this.prisma.role.findMany({
      where: { scope, agencyId: null },
      orderBy: { name: 'asc' },
    });
    return roles.map(toRoleResponse);
  }

  async getById(scope: RoleScope, rawId: string): Promise<RoleResponse> {
    return toRoleResponse(await this.requireRole(scope, rawId));
  }

  async create(scope: RoleScope, input: CreateRoleBody): Promise<RoleResponse> {
    await this.assertKeyAvailable(scope, input.key);
    await this.assertNameAvailable(scope, input.name);

    try {
      const role = await this.prisma.role.create({
        data: {
          key: input.key,
          name: input.name,
          scope,
          agencyId: null,
          description: input.description ?? null,
        },
      });
      return toRoleResponse(role);
    } catch (error) {
      this.throwUniqueConflict(error);
    }
  }

  async update(scope: RoleScope, rawId: string, input: UpdateRoleBody): Promise<RoleResponse> {
    const id = await this.requireRoleId(scope, rawId);

    if (input.name !== undefined) {
      await this.assertNameAvailable(scope, input.name, id);
    }

    const data: Prisma.RoleUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;

    try {
      const role = await this.prisma.role.update({ where: { id }, data });
      return toRoleResponse(role);
    } catch (error) {
      this.throwUniqueConflict(error);
    }
  }

  async remove(scope: RoleScope, rawId: string): Promise<void> {
    const id = await this.requireRoleId(scope, rawId);

    if (scope === 'PLATFORM') {
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
    }

    await this.prisma.role.delete({ where: { id } });
  }

  async listAvailablePermissions(scope: RoleScope): Promise<PermissionResponse[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { scope },
      orderBy: { key: 'asc' },
    });
    return permissions.map(toPermissionResponse);
  }

  async getRolePermissionKeys(scope: RoleScope, rawId: string): Promise<string[]> {
    const role = await this.requireRole(scope, rawId);

    const links = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id, permission: { is: { scope: role.scope } } },
      select: { permission: { select: { key: true } } },
    });
    return links.map((link) => link.permission.key).sort();
  }

  async replaceRolePermissions(
    scope: RoleScope,
    rawId: string,
    permissionKeys: string[],
  ): Promise<ReplaceRolePermissionsResponse> {
    const role = await this.requireRole(scope, rawId);
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

  private async requireRole(scope: RoleScope, rawId: string) {
    const id = this.parseRoleId(rawId);
    const role = await this.prisma.role.findFirst({
      where: { id, scope, agencyId: null },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  private async requireRoleId(scope: RoleScope, rawId: string): Promise<bigint> {
    const id = this.parseRoleId(rawId);
    const role = await this.prisma.role.findFirst({
      where: { id, scope, agencyId: null },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return id;
  }

  private parseRoleId(rawId: string): bigint {
    try {
      return BigInt(rawId);
    } catch {
      throw new NotFoundException('Role not found');
    }
  }

  private async assertKeyAvailable(scope: RoleScope, key: string): Promise<void> {
    const existing = await this.prisma.role.findFirst({
      where: { scope, key, agencyId: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'A role with this technical key already exists for the given scope',
        errorCode: 'ROLE_KEY_SCOPE_CONFLICT',
      });
    }
  }

  private async assertNameAvailable(
    scope: RoleScope,
    name: string,
    excludeId?: bigint,
  ): Promise<void> {
    const existing = await this.prisma.role.findFirst({
      where: { scope, name, agencyId: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'A role with this name already exists for the given scope',
        errorCode: 'ROLE_NAME_SCOPE_CONFLICT',
      });
    }
  }

  /**
   * Translates a unique-constraint violation into a specific conflict. Partial
   * unique indexes make the violated target either `key` or `name`
   * (`role_global_name_key` also contains "key", so "name" is checked first).
   */
  private throwUniqueConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const rawTarget = error.meta?.target;
      const target = Array.isArray(rawTarget)
        ? (rawTarget as unknown[]).join(',')
        : typeof rawTarget === 'string'
          ? rawTarget
          : '';

      if (target.includes('name')) {
        throw new ConflictException({
          statusCode: 409,
          message: 'A role with this name already exists for the given scope',
          errorCode: 'ROLE_NAME_SCOPE_CONFLICT',
        });
      }

      if (target.includes('key')) {
        throw new ConflictException({
          statusCode: 409,
          message: 'A role with this technical key already exists for the given scope',
          errorCode: 'ROLE_KEY_SCOPE_CONFLICT',
        });
      }

      throw new ConflictException({
        statusCode: 409,
        message: 'A role with this name already exists for the given scope',
        errorCode: 'ROLE_NAME_SCOPE_CONFLICT',
      });
    }
    throw error;
  }
}
