import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { AGENCY_ADMIN_SYSTEM_KEY } from '../rbac/rbac.constants.js';

const CODE_PREFIX = 'AGY';
const CODE_RANDOM_BYTES = 6;

/** Mirrors the AppUser code convention: `<PREFIX>-<12 uppercase hex>`. */
export function generateAgencyCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}

export interface ProvisionAgencyInput {
  ownerAppUserId: bigint;
  name: string;
  country?: string | null;
  description?: string | null;
}

export interface ProvisionedAgency {
  id: bigint;
  code: string;
}

/**
 * The single way an Agency comes into existence.
 *
 * An Agency is never created orphaned: the agency row, its ACTIVE OWNER
 * membership and the OWNER's canonical AGENCY_ADMIN role assignment are written
 * together, inside the caller's transaction. If any step fails the caller's
 * transaction rolls back and no partial agency survives.
 *
 * Both entry points use this: platform-side manual creation (`AgenciesService`)
 * and agency application approval (`AgencyApplicationsService`). There is
 * deliberately no second creation path to drift from.
 *
 * Ownership and authorization stay separate concerns here: `membershipType`
 * records WHO OWNS the agency, the AGENCY_ADMIN assignment records WHAT THE
 * OWNER MAY DO. Neither is derived from the other, and the role is resolved by
 * its protected `systemKey` — never by `key` or `name`, which are editable.
 */
@Injectable()
export class AgencyProvisioningService {
  /**
   * Creates the agency together with its complete ownership structure.
   *
   * Runs inside the transaction handed in by the caller so the whole operation
   * is atomic; the deferred `agency_ownership_invariants` trigger re-verifies
   * the result at COMMIT.
   */
  async provision(
    tx: Prisma.TransactionClient,
    input: ProvisionAgencyInput,
  ): Promise<ProvisionedAgency> {
    const agencyAdminRoleId = await this.requireAgencyAdminRoleId(tx);

    const agency = await tx.agency.create({
      data: {
        code: generateAgencyCode(),
        name: input.name,
        country: input.country ?? null,
        description: input.description ?? null,
      },
      select: { id: true, code: true },
    });

    const membership = await tx.agencyMembership.create({
      data: {
        agencyId: agency.id,
        appUserId: input.ownerAppUserId,
        membershipType: 'OWNER',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    await tx.agencyRoleAssignment.create({
      data: { membershipId: membership.id, roleId: agencyAdminRoleId },
    });

    return agency;
  }

  /**
   * Resolves the canonical global agency role by its protected system identity.
   *
   * `scope`/`agencyId` are asserted here as well as in the database
   * (`role_system_key_shape_check`) so a misconfigured catalog fails with a
   * domain error instead of a constraint violation at COMMIT.
   */
  async requireAgencyAdminRoleId(tx: Prisma.TransactionClient): Promise<bigint> {
    const role = await tx.role.findFirst({
      where: { systemKey: AGENCY_ADMIN_SYSTEM_KEY },
      select: { id: true, scope: true, agencyId: true },
    });

    if (!role) {
      throw new BadRequestException({
        statusCode: 400,
        message:
          'The canonical AGENCY_ADMIN system role is missing from the RBAC catalog; run the database seed',
        errorCode: 'AGENCY_ADMIN_ROLE_MISSING',
      });
    }

    if (role.scope !== 'AGENCY' || role.agencyId !== null) {
      throw new ConflictException({
        statusCode: 409,
        message:
          'The canonical AGENCY_ADMIN system role must be a global agency role (scope AGENCY, no owning agency)',
        errorCode: 'AGENCY_ADMIN_ROLE_INVALID',
      });
    }

    return role.id;
  }
}
