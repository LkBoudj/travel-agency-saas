import type { Prisma } from '../generated/prisma/client.js';

export interface AgencyMemberRef {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
}

export interface AgencyResponse {
  code: string;
  name: string;
  status: string;
  country: string | null;
  website: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AgencyRow = Prisma.AgencyGetPayload<{ select: typeof AGENCY_SELECT }>;

export const AGENCY_SELECT = {
  code: true,
  name: true,
  status: true,
  country: true,
  website: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: true } },
} as const satisfies Prisma.AgencySelect;
