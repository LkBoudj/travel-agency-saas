import type { Prisma } from '../generated/prisma/client.js';

/**
 * Lifecycle vocabulary enforced by the `departure_status_check` constraint.
 * OPEN counts toward a SCHEDULED tour's publish readiness; CLOSED and
 * CANCELLED do not. CANCELLED is terminal (one-way, like tour ARCHIVED).
 */
export const DEPARTURE_STATUSES = ['OPEN', 'CLOSED', 'CANCELLED'] as const;
export type DepartureStatus = (typeof DEPARTURE_STATUSES)[number];

/**
 * The public shape of a departure record.
 *
 * No database id, no `tourId`, and no `agencyId` in the contract: `code`
 * (`DEP-...`) is the only stable external key and tenancy is `:agencyCode`
 * plus the `:tourCode` the service already scopes by. Dates are ISO-8601
 * strings. A new departure always starts `OPEN`; the backend never
 * auto-publishes and no status moves implicitly.
 */
export interface DepartureResponse {
  code: string;
  status: DepartureStatus;
  startAt: string;
  endAt: string;
  capacity: number;
  bookingDeadline: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEPARTURE_SELECT = {
  code: true,
  status: true,
  startAt: true,
  endAt: true,
  capacity: true,
  bookingDeadline: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DepartureSelect;

export type DepartureRow = Prisma.DepartureGetPayload<{
  select: typeof DEPARTURE_SELECT;
}>;

export function toDepartureResponse(departure: DepartureRow): DepartureResponse {
  return {
    code: departure.code,
    status: departure.status as DepartureStatus,
    startAt: departure.startAt.toISOString(),
    endAt: departure.endAt.toISOString(),
    capacity: departure.capacity,
    bookingDeadline: departure.bookingDeadline?.toISOString() ?? null,
    notes: departure.notes,
    createdAt: departure.createdAt.toISOString(),
    updatedAt: departure.updatedAt.toISOString(),
  };
}