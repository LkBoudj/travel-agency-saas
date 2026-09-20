import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppUserIdentityService } from '../auth/app-user-identity.service.js';
import { AgencyProvisioningService } from './agency-provisioning.service.js';
import type {
  CreateAgencyBody,
  ListAgenciesQuery,
  SetAgencyStatusBody,
  UpdateAgencyBody,
} from './agencies.schemas.js';
import {
  AGENCY_DETAILS_SELECT,
  AGENCY_SELECT,
  type AgencyDetailsResponse,
  type AgencyDetailsRow,
  type AgencyOwnerRef,
  type AgencyResponse,
  type AgencyRow,
} from './agencies.types.js';

/**
 * Platform-side agency lifecycle.
 *
 * Two rules shape this service:
 *
 * 1. An agency is never created orphaned. Creation always goes through
 *    `AgencyProvisioningService`, the single path that writes the agency, its
 *    ACTIVE OWNER membership and the OWNER's canonical AGENCY_ADMIN assignment
 *    in one transaction. Agency application approval uses the very same path.
 *
 * 2. Agency status is the BUSINESS switch and is completely separate from
 *    membership status. Suspending an agency never suspends its OWNER
 *    membership — an OWNER membership can never be SUSPENDED at all.
 *
 * Ownership, owner name and counts are always derived from relationships; the
 * agency row stores no denormalized owner or counters.
 *
 * This service performs no agency-scoped authorization: agency RBAC is a later
 * slice. Access here is platform authorization only, enforced by the guards on
 * the controller.
 */
@Injectable()
export class AgenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: AgencyProvisioningService,
    private readonly identity: AppUserIdentityService,
  ) {}

  async list(query: ListAgenciesQuery): Promise<AgencyResponse[]> {
    const search = query.search?.trim();
    const agencies = await this.prisma.agency.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' as const } },
                { name: { contains: search, mode: 'insensitive' as const } },
                { country: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: AGENCY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return agencies.map(toAgencyResponse);
  }

  async getByCode(code: string): Promise<AgencyDetailsResponse> {
    const agency = await this.prisma.agency.findUnique({
      where: { code },
      select: AGENCY_DETAILS_SELECT,
    });
    if (!agency) {
      throw this.agencyNotFound();
    }
    return toAgencyDetailsResponse(agency);
  }

  /**
   * Creates an agency together with its owner, as one business operation.
   *
   * The owner is either an account that already exists (EXISTING) or one that is
   * brought into existence here (NEW). In both cases a single transaction writes
   * the agency, its ACTIVE OWNER membership and the owner's canonical
   * AGENCY_ADMIN assignment — and, for a NEW owner, the AppUser as well. If any
   * step fails the whole transaction rolls back, so there is never an orphan
   * account, an agency without an owner, or an owner without the canonical role.
   *
   * A NEW owner receives NO platform role: an AppUser whose only context is an
   * OWNER membership is a valid, fully supported state.
   */
  async create(input: CreateAgencyBody): Promise<AgencyDetailsResponse> {
    const agencyInput = {
      name: input.name,
      country: input.country,
      description: input.description,
    };

    if (input.owner.type === 'EXISTING') {
      const owner = await this.requireEligibleOwner(input.owner.appUserCode);
      const agency = await this.runProvisioning((tx) =>
        this.provisioning.provision(tx, { ...agencyInput, ownerAppUserId: owner.id }),
      );
      return this.getByCode(agency.code);
    }

    // Generating the code and hashing the password happen before the
    // transaction opens, so argon2 never holds one open.
    const identity = await this.identity.prepare(input.owner);

    let agency: { code: string };
    try {
      agency = await this.prisma.$transaction(async (tx) => {
        const appUser = await this.identity.create(tx, identity);
        return this.provisioning.provision(tx, {
          ...agencyInput,
          ownerAppUserId: appUser.id,
        });
      });
    } catch (error) {
      await this.identity.rethrowAsIdentityConflict(error, identity.email, (email) =>
        this.identity.emailExists(this.prisma, email),
      );
      throw mapOwnershipError(error);
    }

    return this.getByCode(agency.code);
  }

  /**
   * Resolves an existing account and checks it may own an agency. The status
   * check is here so the API answers with a clear domain error rather than
   * letting a suspended account through to an ownership invariant.
   */
  private async requireEligibleOwner(appUserCode: string): Promise<{ id: bigint }> {
    const owner = await this.prisma.appUser.findUnique({
      where: { code: appUserCode },
      select: { id: true, status: true },
    });
    if (!owner) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'The owner account does not exist',
        errorCode: 'OWNER_APP_USER_NOT_FOUND',
      });
    }
    if (owner.status !== 'ACTIVE') {
      throw new ConflictException({
        statusCode: 409,
        message: 'A suspended account cannot own an agency',
        errorCode: 'OWNER_APP_USER_NOT_ACTIVE',
      });
    }
    return { id: owner.id };
  }

  private async runProvisioning<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      throw mapOwnershipError(error);
    }
  }

  async update(code: string, input: UpdateAgencyBody): Promise<AgencyDetailsResponse> {
    await this.requireAgencyId(code);

    const data: Prisma.AgencyUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.country !== undefined) data.country = input.country;
    if (input.description !== undefined) data.description = input.description;

    await this.prisma.agency.update({ where: { code }, data });
    return this.getByCode(code);
  }

  /**
   * Suspends or reactivates the BUSINESS.
   *
   * Deliberately a single-row update: membership rows are never touched. The
   * OWNER stays ACTIVE while the agency is SUSPENDED, because membership
   * suspension is not a substitute for agency suspension.
   */
  async setStatus(code: string, input: SetAgencyStatusBody): Promise<AgencyDetailsResponse> {
    await this.requireAgencyId(code);
    await this.prisma.agency.update({ where: { code }, data: { status: input.status } });
    return this.getByCode(code);
  }

  private async requireAgencyId(code: string): Promise<bigint> {
    const agency = await this.prisma.agency.findUnique({ where: { code }, select: { id: true } });
    if (!agency) {
      throw this.agencyNotFound();
    }
    return agency.id;
  }

  private agencyNotFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      message: 'Agency not found',
      errorCode: 'AGENCY_NOT_FOUND',
    });
  }
}

/**
 * Translates an ownership invariant raised by PostgreSQL into the project's
 * domain error contract.
 *
 * The service validates first, so reaching this is rare (a concurrent write, or
 * a deferred trigger firing at COMMIT). It exists so a raw PostgreSQL error is
 * never surfaced to an API consumer.
 */
export function mapOwnershipError(error: unknown): unknown {
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Error
      ? error.message
      : '';

  const known: ReadonlyArray<[string, string, string]> = [
    ['AGENCY_REQUIRES_OWNER', 'AGENCY_REQUIRES_OWNER', 'An agency must always have exactly one OWNER'],
    [
      'AGENCY_REQUIRES_SINGLE_OWNER',
      'AGENCY_REQUIRES_SINGLE_OWNER',
      'An agency must always have exactly one OWNER',
    ],
    [
      'OWNER_CANNOT_BE_SUSPENDED',
      'OWNER_CANNOT_BE_SUSPENDED',
      'The OWNER membership must stay ACTIVE; suspend the agency instead',
    ],
    [
      'OWNER_REQUIRES_AGENCY_ADMIN',
      'OWNER_REQUIRES_AGENCY_ADMIN',
      'The OWNER must hold the canonical AGENCY_ADMIN system role',
    ],
    [
      'SYSTEM_ROLE_PROTECTED',
      'SYSTEM_ROLE_PROTECTED',
      'This role carries a protected system identity and cannot be modified or deleted',
    ],
  ];

  for (const [marker, errorCode, friendly] of known) {
    if (message.includes(marker)) {
      return new ConflictException({ statusCode: 409, message: friendly, errorCode });
    }
  }
  return error;
}

function toOwnerRef(
  members: ReadonlyArray<{
    appUser: { code: string; email: string; firstName: string | null; lastName: string | null; status: string };
  }>,
): AgencyOwnerRef | null {
  const owner = members[0]?.appUser;
  return owner
    ? {
        code: owner.code,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        status: owner.status,
      }
    : null;
}

export function toAgencyResponse(agency: AgencyRow): AgencyResponse {
  return {
    code: agency.code,
    name: agency.name,
    status: agency.status,
    country: agency.country,
    description: agency.description,
    owner: toOwnerRef(agency.members),
    membersCount: agency._count.members,
    createdAt: agency.createdAt.toISOString(),
    updatedAt: agency.updatedAt.toISOString(),
  };
}

export function toAgencyDetailsResponse(agency: AgencyDetailsRow): AgencyDetailsResponse {
  return {
    ...toAgencyResponse(agency),
    applicationId: agency.applications[0]?.id.toString() ?? null,
  };
}
