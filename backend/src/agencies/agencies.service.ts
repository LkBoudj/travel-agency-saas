import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListAgenciesQuery } from './agencies.schemas.js';
import { AGENCY_SELECT, type AgencyResponse, type AgencyRow } from './agencies.types.js';

/**
 * Platform-side read surface for approved agencies. Creation happens only
 * through the agency application approval transaction; the platform can
 * manage lifecycle fields in later slices.
 */
@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getByCode(code: string): Promise<AgencyResponse> {
    return toAgencyResponse(await this.requireAgency(code));
  }

  private async requireAgency(code: string): Promise<AgencyRow> {
    const agency = await this.prisma.agency.findUnique({
      where: { code },
      select: AGENCY_SELECT,
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
    return agency;
  }
}

export function toAgencyResponse(agency: AgencyRow): AgencyResponse {
  return {
    code: agency.code,
    name: agency.name,
    status: agency.status,
    country: agency.country,
    website: agency.website,
    memberCount: agency._count.members,
    createdAt: agency.createdAt.toISOString(),
    updatedAt: agency.updatedAt.toISOString(),
  };
}
