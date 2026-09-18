import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppUserIdentityService } from '../auth/app-user-identity.service.js';
import type {
  CreatePlatformUserBody,
  ListPlatformUsersQuery,
  ReplacePlatformUserRolesBody,
  SetPlatformUserStatusBody,
  UpdatePlatformUserBody,
} from './platform-users.schemas.js';
import { toPlatformUserResponse, toPlatformUserRoleRefs } from './platform-users.serializers.js';
import { PLATFORM_USER_SELECT, type PlatformUserResponse, type PlatformUserRoleRef, type PlatformUserRow, type ReplacePlatformUserRolesResponse } from './platform-users.types.js';

/**
 * CRUD + role-assignment administration for Platform Users.
 *
 * A "Platform User" is an AppUser that has at least one PLATFORM-scoped role
 * assignment (`role.scope = PLATFORM`, `role.agencyId = null`). Every query in
 * this service narrows to that definition, so AppUsers that are only Agency
 * Members (or role-less) are never returned or mutated here.
 *
 * Authorization is handled by the guard layer; this service never resolves a
 * caller's own permissions.
 */
@Injectable()
export class PlatformUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: AppUserIdentityService,
  ) {}

  async list(query: ListPlatformUsersQuery): Promise<PlatformUserResponse[]> {
    const search = query.search?.trim();

    const users = await this.prisma.appUser.findMany({
      where: {
        platformRoleAssignments: {
          some: { role: { is: { scope: 'PLATFORM', agencyId: null } } },
        },
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: PLATFORM_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(toPlatformUserResponse);
  }

  async getByCode(code: string): Promise<PlatformUserResponse> {
    return toPlatformUserResponse(await this.requirePlatformUser(code));
  }

  async create(input: CreatePlatformUserBody): Promise<PlatformUserResponse> {
    const roleKeys = [...new Set(input.roleKeys)];
    // Code generation and hashing happen before the transaction opens.
    const identity = await this.identity.prepare(input);

    try {
      await this.prisma.$transaction(async (tx) => {
        const roles = await this.resolvePlatformRoles(tx, roleKeys);
        const appUser = await this.identity.create(tx, identity);

        await tx.platformRoleAssignment.createMany({
          data: roles.map((role) => ({ appUserId: appUser.id, roleId: role.id })),
          skipDuplicates: true,
        });
      });
    } catch (error) {
      await this.identity.rethrowAsIdentityConflict(error, identity.email, (email) =>
        this.identity.emailExists(this.prisma, email),
      );
    }

    return this.getByCode(identity.code);
  }

  async update(code: string, input: UpdatePlatformUserBody): Promise<PlatformUserResponse> {
    const user = await this.requirePlatformUser(code);

    const data: Prisma.AppUserUpdateInput = {};
    if (input.email !== undefined) data.email = input.email;
    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;

    try {
      await this.prisma.appUser.update({ where: { id: user.id }, data });
    } catch (error) {
      await this.identity.rethrowAsIdentityConflict(
        error,
        input.email ?? user.email,
        (email) => this.identity.emailExists(this.prisma, email),
      );
    }

    return this.getByCode(code);
  }

  async setStatus(
    code: string,
    input: SetPlatformUserStatusBody,
    currentUserId: string,
  ): Promise<PlatformUserResponse> {
    const user = await this.requirePlatformUser(code);

    if (input.status === 'SUSPENDED' && user.id.toString() === currentUserId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'You cannot suspend your own account',
        errorCode: 'CANNOT_SUSPEND_OWN_ACCOUNT',
      });
    }

    await this.prisma.appUser.update({ where: { id: user.id }, data: { status: input.status } });

    return this.getByCode(code);
  }

  async listRoles(code: string): Promise<PlatformUserRoleRef[]> {
    const user = await this.requirePlatformUser(code);
    return toPlatformUserRoleRefs(user);
  }

  async replaceRoles(
    code: string,
    input: ReplacePlatformUserRolesBody,
  ): Promise<ReplacePlatformUserRolesResponse> {
    const user = await this.requirePlatformUser(code);
    const roleKeys = [...new Set(input.roleKeys)];

    await this.prisma.$transaction(async (tx) => {
      const roles = await this.resolvePlatformRoles(tx, roleKeys);
      await tx.platformRoleAssignment.deleteMany({ where: { appUserId: user.id } });
      await tx.platformRoleAssignment.createMany({
        data: roles.map((role) => ({ appUserId: user.id, roleId: role.id })),
        skipDuplicates: true,
      });
    });

    const updated = await this.requirePlatformUser(code);
    return { code, roles: toPlatformUserRoleRefs(updated) };
  }

  /**
   * Loads the PLATFORM-scoped roles for a list of role keys. Every key must
   * resolve to an existing PLATFORM role (`scope = PLATFORM`, `agencyId = null`).
   * AGENCY roles and unknown keys are rejected with a distinct error so the
   * API consumer can tell "this role is real but not assignable" apart from
   * "this role does not exist".
   */
  private async resolvePlatformRoles(
    tx: Prisma.TransactionClient,
    roleKeys: string[],
  ): Promise<Array<{ id: bigint; key: string; name: string }>> {
    const roles = await tx.role.findMany({
      where: { key: { in: roleKeys }, scope: 'PLATFORM', agencyId: null },
      select: { id: true, key: true, name: true, scope: true },
    });
    const foundByKey = new Map(roles.map((role) => [role.key, role]));

    const agencyRoles = await tx.role.findMany({
      where: { key: { in: roleKeys }, scope: 'AGENCY' },
      select: { key: true },
    });
    const agencyKeys = new Set(agencyRoles.map((role) => role.key));

    const agencyOnlyKeys = roleKeys.filter((key) => agencyKeys.has(key));
    if (agencyOnlyKeys.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Only PLATFORM roles can be assigned to platform users',
        errorCode: 'AGENCY_ROLE_NOT_ASSIGNABLE',
        roleKeys: agencyOnlyKeys,
      });
    }

    const unknownKeys = roleKeys.filter((key) => !foundByKey.has(key));
    if (unknownKeys.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Unknown platform role keys',
        errorCode: 'UNKNOWN_PLATFORM_ROLE_KEYS',
        unknownKeys,
      });
    }

    return roles;
  }

  /**
   * Loads a Platform User by code, requiring it to already be (or stay) within
   * the platform scope. Returns 404 for role-less AppUsers and Agency Members,
   * keeping this module strictly a Platform User surface.
   */
  private async requirePlatformUser(code: string): Promise<PlatformUserRow> {
    const user = await this.prisma.appUser.findFirst({
      where: {
        code,
        platformRoleAssignments: {
          some: { role: { is: { scope: 'PLATFORM', agencyId: null } } },
        },
      },
      select: PLATFORM_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('Platform user not found');
    }
    return user;
  }

}