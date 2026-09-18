import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AgencyProvisioningService } from '../agencies/agency-provisioning.service.js';
import type {
  CreateAgencyApplicationBody,
  ListAgencyApplicationsQuery,
  RejectAgencyApplicationBody,
  RequestAgencyApplicationInfoBody,
} from './agency-applications.schemas.js';
import { toAgencyApplicationResponse } from './agency-applications.serializers.js';
import {
  AGENCY_APPLICATION_SELECT,
  type AgencyApplicationResponse,
  type AgencyApplicationRow,
} from './agency-applications.types.js';

/** Statuses from which an application may still transition to a review outcome. */
const REVIEWABLE_STATUSES = ['PENDING', 'NEEDS_INFO'] as const;

/**
 * Agency application lifecycle:
 *
 *   Applicant (any authenticated AppUser) submits -> PENDING
 *   Platform Admin requests more information                     -> NEEDS_INFO
 *   Platform Admin rejects                                       -> REJECTED
 *   Platform Admin approves  => one atomic transaction:
 *     verify eligibility -> provision Agency (agency + ACTIVE OWNER membership
 *     + canonical AGENCY_ADMIN assignment, via AgencyProvisioningService)
 *     -> mark APPROVED -> store approvedAt / approving admin
 *     -> link created Agency
 *
 * The application row is a permanent audit record: it is never deleted and
 * never converted into an Agency. Approval only links it to the agency.
 */
@Injectable()
export class AgencyApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agencyProvisioning: AgencyProvisioningService,
  ) {}

  // ---------------------------------------------------------------- applicant

  async create(appUserId: bigint, input: CreateAgencyApplicationBody): Promise<AgencyApplicationResponse> {
    const application = await this.prisma.agencyApplication.create({
      data: {
        appUserId,
        agencyName: input.agencyName,
        country: input.country ?? null,
        website: input.website ?? null,
        description: input.description ?? null,
        // status defaults to PENDING; review/agency fields stay empty.
      },
      select: AGENCY_APPLICATION_SELECT,
    });
    return toAgencyApplicationResponse(application);
  }

  /** The applicant may read their own applications only. */
  async listMine(appUserId: bigint): Promise<AgencyApplicationResponse[]> {
    const applications = await this.prisma.agencyApplication.findMany({
      where: { appUserId },
      select: AGENCY_APPLICATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return applications.map(toAgencyApplicationResponse);
  }

  /** The applicant may withdraw an application while it is not decided yet. */
  async withdraw(appUserId: bigint, rawId: string): Promise<AgencyApplicationResponse> {
    const application = await this.requireOwnedApplication(appUserId, rawId);
    if (application.status !== 'PENDING' && application.status !== 'NEEDS_INFO') {
      throw new ConflictException({
        statusCode: 409,
        message: 'Only a pending or needs-info application can be withdrawn',
        errorCode: 'APPLICATION_NOT_WITHDRAWABLE',
      });
    }
    const updated = await this.prisma.agencyApplication.update({
      where: { id: application.id },
      data: {
        status: 'WITHDRAWN',
        reviewedAt: new Date(),
      },
      select: AGENCY_APPLICATION_SELECT,
    });
    return toAgencyApplicationResponse(updated);
  }

  // ------------------------------------------------------------ platform admin

  async list(query: ListAgencyApplicationsQuery): Promise<AgencyApplicationResponse[]> {
    const search = query.search?.trim();
    const applications = await this.prisma.agencyApplication.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { agencyName: { contains: search, mode: 'insensitive' as const } },
                { appUser: { is: { email: { contains: search, mode: 'insensitive' as const } } } },
                {
                  appUser: {
                    is: { firstName: { contains: search, mode: 'insensitive' as const } },
                  },
                },
                {
                  appUser: {
                    is: { lastName: { contains: search, mode: 'insensitive' as const } },
                  },
                },
              ],
            }
          : {}),
      },
      select: AGENCY_APPLICATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return applications.map(toAgencyApplicationResponse);
  }

  async getById(rawId: string): Promise<AgencyApplicationResponse> {
    return toAgencyApplicationResponse(await this.requireApplication(rawId));
  }

  async requestInfo(
    rawId: string,
    input: RequestAgencyApplicationInfoBody,
    reviewerAppUserId: string,
  ): Promise<AgencyApplicationResponse> {
    const application = await this.requireApplication(rawId);
    if (!this.isReviewable(application.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Only a pending or needs-info application can be marked as needing information',
        errorCode: 'APPLICATION_NOT_REVIEWABLE',
      });
    }
    const updated = await this.prisma.agencyApplication.update({
      where: { id: application.id },
      data: {
        status: 'NEEDS_INFO',
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
        reviewedByAppUserId: BigInt(reviewerAppUserId),
      },
      select: AGENCY_APPLICATION_SELECT,
    });
    return toAgencyApplicationResponse(updated);
  }

  async reject(
    rawId: string,
    input: RejectAgencyApplicationBody,
    reviewerAppUserId: string,
  ): Promise<AgencyApplicationResponse> {
    const application = await this.requireApplication(rawId);
    if (!this.isReviewable(application.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Only a pending or needs-info application can be rejected',
        errorCode: 'APPLICATION_NOT_REVIEWABLE',
      });
    }
    const updated = await this.prisma.agencyApplication.update({
      where: { id: application.id },
      data: {
        status: 'REJECTED',
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
        reviewedByAppUserId: BigInt(reviewerAppUserId),
      },
      select: AGENCY_APPLICATION_SELECT,
    });
    return toAgencyApplicationResponse(updated);
  }

  /**
   * Approves an application and provisions the agency in one atomic
   * transaction. Idempotency-safe: the eligibility check inside the
   * transaction plus the partial unique index on
   * `agency_application.agency_id` guarantee an application can never create
   * two agencies, even under concurrent approval attempts.
   */
  async approve(
    rawId: string,
    approverAppUserId: string,
  ): Promise<AgencyApplicationResponse> {
    const application = await this.requireApplication(rawId);
    if (!this.isReviewable(application.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Only a pending or needs-info application can be approved',
        errorCode: 'APPLICATION_NOT_REVIEWABLE',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-verify eligibility inside the transaction so a concurrent decision
      // (approve/reject/withdraw) cannot slip through between the check above
      // and this write.
      const current = await tx.agencyApplication.findUnique({
        where: { id: application.id },
        select: { status: true, agencyId: true },
      });
      if (!current || !this.isReviewable(current.status) || current.agencyId !== null) {
        throw new ConflictException({
          statusCode: 409,
          message: 'This application has already been decided',
          errorCode: 'APPLICATION_NOT_REVIEWABLE',
        });
      }

      // Approval creates the agency through the shared provisioning service, so
      // an approved agency gets exactly the same ownership structure as a
      // platform-created one: ACTIVE OWNER membership + canonical AGENCY_ADMIN
      // assignment, atomically. There is no second creation path here.
      const agency = await this.agencyProvisioning.provision(tx, {
        ownerAppUserId: application.appUser.id,
        name: application.agencyName,
        country: application.country,
        // The applicant's website stays on the application record, which is a
        // permanent audit trail, and is no longer copied onto the agency:
        // domains are a separate concern handled later in Agency Settings.
        description: application.description,
      });

      await tx.agencyApplication.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByAppUserId: BigInt(approverAppUserId),
          agencyId: agency.id,
        },
      });
    });

    return this.getById(rawId);
  }

  // ------------------------------------------------------------------ helpers

  private isReviewable(status: string): boolean {
    return (REVIEWABLE_STATUSES as readonly string[]).includes(status);
  }

  private async requireApplication(rawId: string): Promise<AgencyApplicationRow> {
    const id = this.parseApplicationId(rawId);
    const application = await this.prisma.agencyApplication.findUnique({
      where: { id },
      select: AGENCY_APPLICATION_SELECT,
    });
    if (!application) {
      throw new NotFoundException('Agency application not found');
    }
    return application;
  }

  private async requireOwnedApplication(
    appUserId: bigint,
    rawId: string,
  ): Promise<AgencyApplicationRow> {
    const id = this.parseApplicationId(rawId);
    const application = await this.prisma.agencyApplication.findFirst({
      where: { id, appUserId },
      select: AGENCY_APPLICATION_SELECT,
    });
    if (!application) {
      throw new NotFoundException('Agency application not found');
    }
    return application;
  }

  private parseApplicationId(rawId: string): bigint {
    try {
      return BigInt(rawId);
    } catch {
      throw new NotFoundException('Agency application not found');
    }
  }
}
