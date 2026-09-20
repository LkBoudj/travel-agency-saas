import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * The only shape this lookup ever exposes. `code` is the stable identifier the
 * client sends back when creating the agency; no database id, password material
 * or role information is part of it.
 */
export interface AppUserOption {
  code: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
}

/** Hard cap: this endpoint answers a picker, it never pages a directory. */
export const APP_USER_LOOKUP_LIMIT = 20;

@Injectable()
export class AppUserLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async search(search: string): Promise<AppUserOption[]> {
    const term = search.trim();
    const contains = { contains: term, mode: 'insensitive' as const };

    const users = await this.prisma.appUser.findMany({
      where: {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
          { code: contains },
        ],
      },
      select: {
        code: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
      // Accounts that can actually be selected as an owner come first.
      orderBy: [{ status: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
      take: APP_USER_LOOKUP_LIMIT,
    });

    return users;
  }
}
