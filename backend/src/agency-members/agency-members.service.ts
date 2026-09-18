import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppUserIdentityService } from '../auth/app-user-identity.service.js';
import { isRoleValidForAgency } from '../authorization/agency-permissions.service.js';
import type {
  AddAgencyMemberBody,
  ListAgencyMembersQuery,
  ReplaceAgencyMemberRolesBody,
  SetAgencyMemberStatusBody,
} from './agency-members.schemas.js';
import {
  AGENCY_MEMBER_SELECT,
  type AgencyMemberResponse,
  type AgencyMemberRow,
  type AssignableAgencyRoleResponse,
  type MemberCandidateResponse,
} from './agency-members.types.js';

/** Members are created as employees; ownership is never touched here. */
const EMPLOYEE = 'EMPLOYEE';
const OWNER = 'OWNER';
const ACTIVE = 'ACTIVE';

/** A lookup answers a picker, never a directory. */
const CANDIDATE_LIMIT = 20;

/**
 * Agency member administration, scoped to ONE agency.
 *
 * Every method takes the `agencyId` the guard already resolved from the route,
 * and every query is filtered by it, so an operation issued through agency A's
 * route can only ever read or mutate agency A's rows. No method accepts an
 * agency identifier from a request body.
 *
 * Two domain rules shape the whole file:
 *
 * 1. OWNER is not managed here. The owner's membership can be read, but it can
 *    never be suspended, removed, re-roled or converted through these endpoints.
 *    Ownership transfer is a separate, future operation.
 * 2. `membershipType` classifies the person; ROLES say what they may do. No
 *    placeholder "Employee" role is invented, and an employee with zero roles is
 *    a valid member with zero business permissions.
 */
@Injectable()
export class AgencyMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: AppUserIdentityService,
  ) {}

  async list(agencyId: bigint, query: ListAgencyMembersQuery): Promise<AgencyMemberResponse[]> {
    const search = query.search?.trim();
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;

    const members = await this.prisma.agencyMembership.findMany({
      where: {
        agencyId,
        ...(contains
          ? {
              appUser: {
                is: {
                  OR: [
                    { firstName: contains },
                    { lastName: contains },
                    { email: contains },
                    { code: contains },
                  ],
                },
              },
            }
          : {}),
      },
      select: AGENCY_MEMBER_SELECT,
      // The owner first, then employees by join date: one row per person, no
      // matter how many roles they hold.
      orderBy: [{ membershipType: 'asc' }, { createdAt: 'asc' }],
    });

    return members.map((member) => toMemberResponse(member, agencyId));
  }

  async getByUserCode(agencyId: bigint, userCode: string): Promise<AgencyMemberResponse> {
    return toMemberResponse(await this.requireMember(agencyId, userCode), agencyId);
  }

  /**
   * Roles that may be assigned inside this agency: global agency roles plus
   * this agency's own custom roles. PLATFORM roles and other agencies' custom
   * roles are never returned.
   */
  async listAssignableRoles(agencyId: bigint): Promise<AssignableAgencyRoleResponse[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        scope: 'AGENCY',
        OR: [{ agencyId: null }, { agencyId }],
      },
      select: { key: true, name: true, description: true },
      orderBy: { key: 'asc' },
    });
    // Projected field by field rather than returned raw, so widening the select
    // later cannot silently widen the response.
    return roles.map((role) => ({
      key: role.key,
      name: role.name,
      description: role.description,
    }));
  }

  /**
   * Accounts that could become a member here. Requires a search term and caps
   * the result, so it can never act as a global user directory.
   */
  /**
   * Adds a member as an ACTIVE EMPLOYEE, with the requested roles, atomically.
   *
   * For a NEW account the AppUser is created in the same transaction, so a
   * failure anywhere leaves no orphan account. The new account receives NO
   * platform role: its only context is this membership.
   */
  /**
   * Replaces an employee's complete role set in one transaction.
   *
   * An empty list is valid and leaves an ACTIVE employee with no business
   * permissions. The OWNER is rejected: their canonical role is an ownership
   * invariant, not something general member management may rewrite.
   */
  async replaceRoles(
    agencyId: bigint,
    userCode: string,
    input: ReplaceAgencyMemberRolesBody,
  ): Promise<AgencyMemberResponse> {
    const member = await this.requireMember(agencyId, userCode);
    this.assertNotOwner(
      member,
      'The owner’s roles cannot be changed here; they are part of the ownership invariant',
      'OWNER_ROLES_IMMUTABLE',
    );

    const roleKeys = [...new Set(input.roleKeys)];

    await this.prisma.$transaction(async (tx) => {
      const roleIds = await this.resolveAssignableRoleIds(tx, agencyId, roleKeys);
      await tx.agencyRoleAssignment.deleteMany({ where: { membershipId: member.id } });
      if (roleIds.length > 0) {
        await tx.agencyRoleAssignment.createMany({
          data: roleIds.map((roleId) => ({ membershipId: member.id, roleId })),
          skipDuplicates: true,
        });
      }
    });

    return this.getByUserCode(agencyId, userCode);
  }

  /**
   * Suspends or reactivates access to THIS agency.
   *
   * `AppUser.status`, memberships in other agencies and platform access are all
   * untouched: a suspended membership fails agency authorization here and
   * nowhere else.
   */
  async setStatus(
    agencyId: bigint,
    userCode: string,
    input: SetAgencyMemberStatusBody,
  ): Promise<AgencyMemberResponse> {
    const member = await this.requireMember(agencyId, userCode);
    this.assertNotOwner(
      member,
      'The owner cannot be suspended; suspend the agency instead, or transfer ownership first',
      'OWNER_CANNOT_BE_SUSPENDED',
    );

    await this.prisma.agencyMembership.update({
      where: { id: member.id },
      data: { status: input.status },
    });

    return this.getByUserCode(agencyId, userCode);
  }

  /**
   * Removes the membership from THIS agency only.
   *
   * The AppUser survives, as do its other agency memberships and any platform
   * access. Role assignments go with the membership through the schema's
   * cascade.
   */
  async remove(agencyId: bigint, userCode: string): Promise<void> {
    const member = await this.requireMember(agencyId, userCode);
    this.assertNotOwner(
      member,
      'The owner cannot be removed; transfer ownership first',
      'OWNER_CANNOT_BE_REMOVED',
    );

    await this.prisma.agencyMembership.delete({ where: { id: member.id } });
  }

  // ------------------------------------------------------------------ helpers

  /**
   * Resolves role keys to ids, accepting only roles assignable in THIS agency.
   *
   * Unknown keys, PLATFORM roles and custom roles owned by another agency are
   * all rejected with a distinct error, so the caller can tell "this role does
   * not exist" from "this role is not yours". The database trigger
   * `agency_role_assignment_scope` is the final protection behind this.
   */
  private async resolveAssignableRoleIds(
    tx: Prisma.TransactionClient,
    agencyId: bigint,
    roleKeys: string[],
  ): Promise<bigint[]> {
    if (roleKeys.length === 0) {
      return [];
    }

    const roles = await tx.role.findMany({
      where: { key: { in: roleKeys } },
      select: { id: true, key: true, scope: true, agencyId: true },
    });

    const assignable = roles.filter((role) => isRoleValidForAgency(role, agencyId));
    const assignableByKey = new Map(assignable.map((role) => [role.key, role]));

    const notAssignable = roles
      .filter((role) => !assignableByKey.has(role.key))
      .map((role) => role.key);
    if (notAssignable.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'One or more roles cannot be assigned in this agency',
        errorCode: 'ROLE_NOT_ASSIGNABLE_IN_AGENCY',
        roleKeys: notAssignable,
      });
    }

    const unknownKeys = roleKeys.filter((key) => !assignableByKey.has(key));
    if (unknownKeys.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Unknown agency role keys',
        errorCode: 'UNKNOWN_AGENCY_ROLE_KEYS',
        unknownKeys,
      });
    }

    return assignable.map((role) => role.id);
  }

  /**
   * Membership in another agency is perfectly valid and is not a conflict; only
   * a second membership in THIS agency is.
   */
  /** Always scoped by `agencyId`, so another agency's membership is a 404 here. */
  private async requireMember(agencyId: bigint, userCode: string): Promise<AgencyMemberRow> {
    const member = await this.prisma.agencyMembership.findFirst({
      where: { agencyId, appUser: { is: { code: userCode } } },
      select: AGENCY_MEMBER_SELECT,
    });
    if (!member) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That member was not found in this agency',
        errorCode: 'AGENCY_MEMBER_NOT_FOUND',
      });
    }
    return member;
  }

  private assertNotOwner(member: AgencyMemberRow, message: string, errorCode: string): void {
    if (member.membershipType === OWNER) {
      throw new ConflictException({ statusCode: 409, message, errorCode });
    }
  }
}

/**
 * Projects a membership row onto the HTTP contract.
 *
 * Roles are re-filtered through the same tenancy rule the authorization service
 * uses, so a row that somehow predates the cross-tenant trigger is never
 * presented as if it applied here.
 */
export function toMemberResponse(
  member: AgencyMemberRow,
  agencyId: bigint,
): AgencyMemberResponse {
  const roles = member.agencyRoleAssignments
    .map((assignment) => assignment.role)
    .filter((role) => isRoleValidForAgency(role, agencyId))
    .map((role) => ({ key: role.key, name: role.name }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    code: member.appUser.code,
    firstName: member.appUser.firstName,
    lastName: member.appUser.lastName,
    email: member.appUser.email,
    accountStatus: member.appUser.status,
    membershipType: member.membershipType,
    membershipStatus: member.status,
    roles,
    joinedAt: member.createdAt.toISOString(),
  };
}
