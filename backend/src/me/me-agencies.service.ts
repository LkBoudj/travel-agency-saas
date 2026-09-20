import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * One agency the signed-in user belongs to, as the agency picker needs it.
 *
 * Deliberately minimal: no database ids, no roles, no permissions, no
 * `systemKey`, and nothing about any other member. Roles and permissions are
 * resolved per agency by `GET /v1/agencies/:agencyCode/me` once an agency has
 * actually been chosen.
 */
export interface MyAgencyResponse {
  code: string;
  name: string;
  /** Agency lifecycle status (ACTIVE | SUSPENDED). */
  status: string;
  /** OWNER | EMPLOYEE. Informational — never an authorization input. */
  membershipType: string;
  /** This membership's status in that agency (ACTIVE | SUSPENDED). */
  membershipStatus: string;
}

/**
 * Lists the agencies the authenticated user is a member of.
 *
 * This runs BEFORE any agency is selected, so it cannot be guarded by an agency
 * permission — the caller has no agency context yet. Its safety comes from
 * scope instead: every query is filtered by the caller's own id, so the
 * response can only ever describe the caller's own memberships.
 *
 * SUSPENDED agencies and SUSPENDED memberships are included on purpose. Hiding
 * them would leave someone staring at an empty list with no explanation; the UI
 * can show them as unavailable and say why. Entering them is still refused by
 * the agency guard, which stays authoritative.
 */
@Injectable()
export class MeAgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(appUserId: string): Promise<MyAgencyResponse[]> {
    const memberships = await this.prisma.agencyMembership.findMany({
      where: { appUserId: this.parseUserId(appUserId) },
      select: {
        membershipType: true,
        status: true,
        agency: { select: { code: true, name: true, status: true } },
      },
      // Owner first, then by agency name, so the picker reads predictably.
      orderBy: [{ membershipType: 'asc' }, { agency: { name: 'asc' } }],
    });

    return memberships.map((membership) => ({
      code: membership.agency.code,
      name: membership.agency.name,
      status: membership.agency.status,
      membershipType: membership.membershipType,
      membershipStatus: membership.status,
    }));
  }

  private parseUserId(appUserId: string): bigint {
    try {
      return BigInt(appUserId);
    } catch {
      // An unparsable subject is not an identity we can scope a query to.
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid user identity',
        errorCode: 'INVALID_USER_IDENTITY',
      });
    }
  }
}
