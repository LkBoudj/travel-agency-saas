import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AgencyAccessContext,
  AgencyContextRole,
} from './agency-access.js';

/** An agency may only be operated on while it is ACTIVE. */
const OPERATIONAL_AGENCY_STATUS = 'ACTIVE';
/** Only an ACTIVE membership grants agency-side access. */
const ACTIVE_MEMBERSHIP_STATUS = 'ACTIVE';

/**
 * Resolves what an authenticated AppUser may do INSIDE one specific agency.
 *
 * The chain is always walked in full, per request, from the database:
 *
 *   AppUser -> AgencyMembership -> AgencyRoleAssignment -> Role
 *           -> RolePermission -> Permission.key
 *
 * Nothing about agency access lives in the JWT, so revoking a role or a
 * permission takes effect on the very next request without reissuing a token —
 * exactly like `PlatformPermissionsService` does for the platform side.
 *
 * Two rules make this multi-tenant safe, and both fail closed:
 *
 * 1. A role only counts when `scope = AGENCY` AND it is either global
 *    (`agencyId = null`) or owned by THIS agency. A custom role belonging to
 *    another agency contributes nothing, even if it is somehow assigned.
 * 2. A permission only counts when `permission.scope = AGENCY`. A PLATFORM
 *    permission can never grant agency-side access.
 *
 * Membership is never inferred from roles: an AppUser without an ACTIVE
 * membership in the requested agency is denied before permissions are even
 * considered.
 */
@Injectable()
export class AgencyPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the full agency context for a user and an agency code.
   *
   * Throws the domain error that matches the first failed step, so the API can
   * distinguish "no such agency" from "not your agency" from "agency closed".
   */
  async resolveAccess(appUserId: string, agencyCode: string): Promise<AgencyAccessContext> {
    const userId = this.parseUserId(appUserId);

    // One query for the agency, this user's membership, its role assignments
    // and each role's AGENCY permissions: no N+1, and no query needs a role id
    // that is only known later.
    const agency = await this.prisma.agency.findUnique({
      where: { code: agencyCode },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        members: {
          where: { appUserId: userId },
          select: {
            id: true,
            membershipType: true,
            status: true,
            agencyRoleAssignments: {
              select: {
                role: {
                  select: {
                    key: true,
                    name: true,
                    scope: true,
                    agencyId: true,
                    permissions: {
                      where: { permission: { is: { scope: 'AGENCY' } } },
                      select: { permission: { select: { key: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!agency) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Agency not found',
        errorCode: 'AGENCY_NOT_FOUND',
      });
    }

    if (agency.status !== OPERATIONAL_AGENCY_STATUS) {
      // The business is closed. Platform administration of this agency is a
      // different surface and stays available; agency-side work does not.
      throw new ForbiddenException({
        statusCode: 403,
        message: 'This agency is suspended',
        errorCode: 'AGENCY_SUSPENDED',
      });
    }

    const membership = agency.members[0];
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You are not a member of this agency',
        errorCode: 'AGENCY_MEMBERSHIP_REQUIRED',
      });
    }

    if (membership.status !== ACTIVE_MEMBERSHIP_STATUS) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Your membership in this agency is not active',
        errorCode: 'AGENCY_MEMBERSHIP_INACTIVE',
      });
    }

    const validRoles = membership.agencyRoleAssignments
      .map((assignment) => assignment.role)
      .filter((role) => isRoleValidForAgency(role, agency.id));

    const permissionKeys = new Set<string>();
    const roles: AgencyContextRole[] = [];
    for (const role of validRoles) {
      roles.push({ key: role.key, name: role.name });
      for (const link of role.permissions) {
        permissionKeys.add(link.permission.key);
      }
    }

    return {
      agency: {
        id: agency.id,
        code: agency.code,
        name: agency.name,
        status: agency.status,
      },
      membership: {
        id: membership.id,
        membershipType: membership.membershipType,
        status: membership.status,
      },
      roles: roles.sort((a, b) => a.key.localeCompare(b.key)),
      permissionKeys: [...permissionKeys].sort(),
    };
  }

  private parseUserId(appUserId: string): bigint {
    try {
      return BigInt(appUserId);
    } catch {
      // An unparsable subject is not an identity we can scope anything to.
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You are not a member of this agency',
        errorCode: 'AGENCY_MEMBERSHIP_REQUIRED',
      });
    }
  }
}

/**
 * Whether a role assigned to a membership may contribute permissions inside
 * `agencyId`.
 *
 * Valid: a global agency role (`scope = AGENCY`, `agencyId = null`), or a
 * custom role owned by this very agency. Everything else — PLATFORM roles and
 * custom roles owned by a different agency — contributes nothing.
 *
 * The database also rejects such an assignment (see the
 * `agency_role_assignment_scope` trigger); this check is the second lock, so a
 * row that somehow predates or bypasses the constraint still grants nothing.
 */
export function isRoleValidForAgency(
  role: { scope: string; agencyId: bigint | null },
  agencyId: bigint,
): boolean {
  if (role.scope !== 'AGENCY') {
    return false;
  }
  return role.agencyId === null || role.agencyId === agencyId;
}
