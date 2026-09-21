import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SecurityModule } from '../security/security.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { BookingsModule } from './bookings.module.js';

/**
 * Agency bookings over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models this domain's graph: the agency, its
 * customers, tours and departures, the stored departure prices, the bookings
 * with their immutable price-line snapshots and status history, and the audit
 * log. The CHECK constraints (status vocabulary, currency shape, seat/capacity
 * bounds) live in the migration and are verified against PostgreSQL there, not
 * here; the interactive transaction + row lock is modeled by running the
 * callback against the same double under `$transaction`.
 */

type CustomerRow = {
  id: bigint;
  agencyId: bigint;
  code: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type TourRow = {
  id: bigint;
  agencyId: bigint;
  code: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type DepartureRow = {
  id: bigint;
  tourId: bigint;
  code: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  capacity: number;
  startAt: Date;
  bookingDeadline: Date | null;
};

type PricingOptionRow = {
  id: bigint;
  tourId: bigint;
  code: string;
  name: string;
  basis: 'per_person' | 'per_booking';
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type DeparturePriceRow = {
  departureId: bigint;
  pricingOptionId: bigint;
  amount: number;
};

type BookingRow = {
  id: bigint;
  code: string;
  agencyId: bigint;
  customerId: bigint;
  tourId: bigint;
  departureId: bigint;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  reservedSeats: number;
  currency: string;
  totalAmount: unknown;
  notes: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingPriceLineRow = {
  id: bigint;
  bookingId: bigint;
  pricingOptionId: bigint | null;
  optionCode: string;
  optionName: string;
  basis: string;
  currency: string;
  unitAmount: number;
  quantity: number;
  lineTotal: number;
};

type BookingStatusHistoryRow = {
  id: bigint;
  bookingId: bigint;
  fromStatus: string | null;
  toStatus: string;
  actorCode: string | null;
  reason: string | null;
  createdAt: Date;
};

type TravelerRow = {
  id: bigint;
  code: string;
  bookingId: bigint;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RoleRow = {
  id: bigint;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  agencyId: bigint | null;
  permissionKeys: string[];
};

type UserRow = {
  id: bigint;
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  passwordHash: string;
};

type MembershipRow = {
  id: bigint;
  agencyId: bigint;
  appUserId: bigint;
  membershipType: string;
  status: string;
  createdAt: Date;
  roleIds: bigint[];
};

const NOW = new Date('2026-09-20T10:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };

const ALL_BOOKING_PERMISSIONS = [
  'AGENCY_BOOKING_VIEW',
  'AGENCY_BOOKING_CREATE',
  'AGENCY_BOOKING_UPDATE',
  'AGENCY_BOOKING_CANCEL',
] as const;

const VIEW_ONLY_PERMISSIONS = ['AGENCY_BOOKING_VIEW'] as const;

const DB = {
  customers: [] as CustomerRow[],
  tours: [] as TourRow[],
  departures: [] as DepartureRow[],
  pricingOptions: [] as PricingOptionRow[],
  departurePrices: [] as DeparturePriceRow[],
  bookings: [] as BookingRow[],
  priceLines: [] as BookingPriceLineRow[],
  statusHistory: [] as BookingStatusHistoryRow[],
  travelers: [] as TravelerRow[],
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  auditLog: [] as Array<{
    action: string;
    targetCode?: string;
    agencyCode?: string;
    metadata?: unknown;
  }>,
};

let nextId = 100n;
let nextCodeSeq = 1;
function id(): bigint {
  const value = nextId;
  nextId += 1n;
  return value;
}
function publicCode(prefix: string): string {
  const value = (nextCodeSeq++).toString(16).padStart(12, '0').toUpperCase();
  return `${prefix}-${value}`;
}

function addRole(
  key: string,
  scope: string,
  agencyId: bigint | null,
  permissionKeys: string[] = [],
  name = key,
): RoleRow {
  const row: RoleRow = {
    id: id(),
    key,
    name,
    description: `${name} description`,
    scope,
    agencyId,
    permissionKeys,
  };
  DB.roles.set(row.id, row);
  return row;
}

function addUser(seed: { id: bigint; code: string; email: string }, status = 'ACTIVE'): UserRow {
  const row: UserRow = {
    id: seed.id,
    code: seed.code,
    email: seed.email,
    firstName: 'First',
    lastName: 'Last',
    status,
    passwordHash: '$argon2id$seeded',
  };
  DB.users.set(row.id, row);
  return row;
}

function addMembership(
  agencyId: bigint,
  appUserId: bigint,
  roleIds: bigint[],
  overrides: Partial<MembershipRow> = {},
): MembershipRow {
  const row: MembershipRow = {
    id: id(),
    agencyId,
    appUserId,
    membershipType: 'EMPLOYEE',
    status: 'ACTIVE',
    createdAt: NOW,
    roleIds,
    ...overrides,
  };
  DB.memberships.push(row);
  return row;
}

function addCustomer(
  agencyId: bigint,
  overrides: Partial<Omit<CustomerRow, 'id' | 'agencyId' | 'code'>> = {},
): CustomerRow {
  const row: CustomerRow = {
    id: id(),
    agencyId,
    code: publicCode('CUS'),
    firstName: 'Amel',
    lastName: 'Benali',
    status: 'ACTIVE',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.customers.push(row);
  return row;
}

function addTour(
  agencyId: bigint,
  overrides: Partial<Omit<TourRow, 'id' | 'agencyId' | 'code'> & { code?: string }> = {},
): TourRow {
  const row: TourRow = {
    id: id(),
    agencyId,
    code: overrides.code ?? publicCode('TUR'),
    name: 'Algiers by night',
    status: 'PUBLISHED',
    ...overrides,
  };
  DB.tours.push(row);
  return row;
}

function addDeparture(
  tourId: bigint,
  overrides: Partial<Omit<DepartureRow, 'id' | 'tourId' | 'code'> & { code?: string }> = {},
): DepartureRow {
  const row: DepartureRow = {
    id: id(),
    tourId,
    code: overrides.code ?? publicCode('DEP'),
    status: 'OPEN',
    capacity: 12,
    startAt: new Date('2026-12-20T08:00:00.000Z'),
    bookingDeadline: null,
    ...overrides,
  };
  DB.departures.push(row);
  return row;
}

function addPricingOption(
  tourId: bigint,
  overrides: Partial<Omit<PricingOptionRow, 'id' | 'tourId' | 'code'> & { code?: string }> = {},
): PricingOptionRow {
  const row: PricingOptionRow = {
    id: id(),
    tourId,
    code: overrides.code ?? publicCode('PRC'),
    name: 'Adult',
    basis: 'per_person',
    currency: 'DZD',
    status: 'ACTIVE',
    ...overrides,
  };
  DB.pricingOptions.push(row);
  return row;
}

function addDeparturePrice(
  departureId: bigint,
  pricingOptionId: bigint,
  amount: number,
): DeparturePriceRow {
  const row: DeparturePriceRow = { departureId, pricingOptionId, amount };
  DB.departurePrices.push(row);
  return row;
}

function addBooking(
  departure: DepartureRow,
  tour: TourRow,
  customer: CustomerRow,
  overrides: Partial<
    Omit<BookingRow, 'id' | 'code' | 'agencyId' | 'customerId' | 'tourId' | 'departureId'>
  > = {},
): BookingRow {
  const row: BookingRow = {
    id: id(),
    code: publicCode('BKG'),
    agencyId: tour.agencyId,
    customerId: customer.id,
    tourId: tour.id,
    departureId: departure.id,
    status: 'PENDING',
    reservedSeats: 2,
    currency: 'DZD',
    totalAmount: 192000,
    notes: null,
    confirmedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.bookings.push(row);
  return row;
}

function addPriceLine(bookingId: bigint, overrides: Partial<BookingPriceLineRow> = {}): BookingPriceLineRow {
  const row: BookingPriceLineRow = {
    id: id(),
    bookingId,
    pricingOptionId: 1n,
    optionCode: 'PRC-000000000001',
    optionName: 'Adult',
    basis: 'per_person',
    currency: 'DZD',
    unitAmount: 96000,
    quantity: 2,
    lineTotal: 192000,
    ...overrides,
  };
  DB.priceLines.push(row);
  return row;
}

function addStatusHistory(
  bookingId: bigint,
  overrides: Partial<BookingStatusHistoryRow> = {},
): BookingStatusHistoryRow {
  const row: BookingStatusHistoryRow = {
    id: id(),
    bookingId,
    fromStatus: null,
    toStatus: 'PENDING',
    actorCode: admin.code,
    reason: null,
    createdAt: NOW,
    ...overrides,
  };
  DB.statusHistory.push(row);
  return row;
}

function addTraveler(
  bookingId: bigint,
  overrides: Partial<TravelerRow> = {},
): TravelerRow {
  const row: TravelerRow = {
    id: id(),
    code: publicCode('TRV'),
    bookingId,
    firstName: 'Amel',
    lastName: 'Benali',
    email: null,
    phone: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.travelers.push(row);
  return row;
}

function projectBooking(row: BookingRow) {
  const customer = DB.customers.find((c) => c.id === row.customerId)!;
  const tour = DB.tours.find((t) => t.id === row.tourId)!;
  const departure = DB.departures.find((d) => d.id === row.departureId)!;
  return {
    code: row.code,
    status: row.status,
    reservedSeats: row.reservedSeats,
    currency: row.currency,
    totalAmount: row.totalAmount,
    notes: row.notes,
    confirmedAt: row.confirmedAt,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: { code: customer.code, firstName: customer.firstName, lastName: customer.lastName },
    tour: { code: tour.code, name: tour.name },
    departure: { code: departure.code, startAt: departure.startAt },
  };
}

function projectBookingDetail(row: BookingRow) {
  return {
    ...projectBooking(row),
    id: row.id,
    departureId: row.departureId,
    priceLines: DB.priceLines
      .filter((l) => l.bookingId === row.id)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((l) => ({
        id: l.id,
        optionCode: l.optionCode,
        optionName: l.optionName,
        basis: l.basis,
        currency: l.currency,
        unitAmount: l.unitAmount,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    statusHistory: DB.statusHistory
      .filter((h) => h.bookingId === row.id)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        actorCode: h.actorCode,
        reason: h.reason,
        createdAt: h.createdAt,
      })),
  };
}

function projectTraveler(row: TravelerRow) {
  return {
    code: row.code,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint; code?: string; email?: string } }) => {
      const user = [...DB.users.values()].find(
        (u) =>
          (where.id !== undefined && u.id === where.id) ||
          (where.code !== undefined && u.code === where.code) ||
          (where.email !== undefined && u.email === where.email),
      );
      return user ? { ...user } : null;
    }),
  },
  agency: {
    findUnique: vi.fn(
      async (args: {
        where: { code: string };
        select: { members: { where: { appUserId: bigint } } };
      }) => {
        const agency = [...DB.agencies.values()].find((a) => a.code === args.where.code);
        if (!agency) return null;
        const { appUserId } = args.select.members.where;
        const members = DB.memberships
          .filter((m) => m.agencyId === agency.id && m.appUserId === appUserId)
          .map((m) => ({
            id: m.id,
            membershipType: m.membershipType,
            status: m.status,
            agencyRoleAssignments: m.roleIds.map((roleId) => {
              const role = DB.roles.get(roleId)!;
              return {
                role: {
                  key: role.key,
                  name: role.name,
                  scope: role.scope,
                  agencyId: role.agencyId,
                  permissions: role.permissionKeys
                    .filter((k) => !k.startsWith('PLATFORM_'))
                    .map((k) => ({ permission: { key: k } })),
                },
              };
            }),
          }));
        return { ...agency, members };
      },
    ),
  },
  role: {
    findMany: vi.fn(async ({ where }: { where: { id: { in: bigint[] } } }) => {
      const rows = [];
      for (const { id } of where.id.in) {
        const row = DB.roles.get(id);
        if (row) rows.push(row);
      }
      return rows;
    }),
  },
  agencyMembership: {
    findMany: vi.fn(
      async ({
        where,
      }: {
        where: { agencyId?: bigint; appUserId?: bigint };
      }) => {
        let rows = [...DB.memberships];
        if (where.agencyId) rows = rows.filter((r) => r.agencyId === where.agencyId);
        if (where.appUserId) rows = rows.filter((r) => r.appUserId === where.appUserId);
        return rows;
      },
    ),
  },
  customer: {
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { agencyId: bigint; code: string };
        select: { id: true; status: true };
      }) => {
        const row = DB.customers.find(
          (c) => c.agencyId === where.agencyId && c.code === where.code,
        );
        if (!row) return null;
        return { id: row.id, status: row.status };
      },
    ),
  },
  departure: {
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { code: string; tour: { agencyId: bigint } };
        select: { id: true };
      }) => {
        const row = DB.departures.find(
          (d) =>
            d.code === where.code &&
            DB.tours.some((t) => t.id === d.tourId && t.agencyId === where.tour.agencyId),
        );
        if (!row) return null;
        return { id: row.id };
      },
    ),
  },
  tour: {
    findUnique: vi.fn(
      async ({
        where,
      }: {
        where: { id: bigint };
        select: { status: true };
      }) => {
        const row = DB.tours.find((t) => t.id === where.id);
        if (!row) return null;
        return { status: row.status };
      },
    ),
  },
  departurePrice: {
    findMany: vi.fn(
      async ({
        where,
      }: {
        where: { departureId: bigint };
        select: {
          amount: true;
          pricingOption: { select: { id: true; code: true; name: true; basis: true; currency: true; status: true } };
        };
      }) => {
        return DB.departurePrices
          .filter((row) => row.departureId === where.departureId)
          .map((row) => {
            const option = DB.pricingOptions.find((o) => o.id === row.pricingOptionId)!;
            return {
              amount: row.amount,
              pricingOption: {
                id: option.id,
                code: option.code,
                name: option.name,
                basis: option.basis,
                currency: option.currency,
                status: option.status,
              },
            };
          });
      },
    ),
  },
  booking: {
    aggregate: vi.fn(
      async ({
        where,
      }: {
        where: { departureId: bigint; status: { in: string[] } };
      }) => {
        const reservedSeats = DB.bookings
          .filter(
            (b) =>
              b.departureId === where.departureId &&
              where.status.in.includes(b.status),
          )
          .reduce((sum, b) => sum + b.reservedSeats, 0);
        return { _sum: { reservedSeats } };
      },
    ),
    findMany: vi.fn(
      async ({
        where,
        orderBy,
      }: {
        where: Record<string, unknown>;
        orderBy?: { createdAt: 'desc' };
      }) => {
        let rows = DB.bookings.filter((b) => {
          if (typeof where.agencyId === 'bigint' && b.agencyId !== where.agencyId) return false;
          if (typeof where.status === 'string' && b.status !== where.status) return false;
          if (
            typeof where.status === 'object' &&
            where.status &&
            'in' in where.status
          ) {
            const statuses = (where.status as { in: string[] }).in;
            if (!statuses.includes(b.status)) return false;
          }
          if (where.customer && typeof where.customer === 'object') {
            const customerCode = (where.customer as { code?: unknown }).code;
            if (typeof customerCode === 'string' && b.customerCode !== customerCode) {
              const customer = DB.customers.find((c) => c.id === b.customerId)!;
              if (customer.code !== customerCode) return false;
            }
          }
          if (where.departure && typeof where.departure === 'object') {
            const departureCode = (where.departure as { code?: unknown }).code;
            if (typeof departureCode === 'string' && b.departureCode !== departureCode) {
              const departure = DB.departures.find((d) => d.id === b.departureId)!;
              if (departure.code !== departureCode) return false;
            }
          }
          if (where.OR && Array.isArray(where.OR)) {
            const or = where.OR as Array<Record<string, unknown>>;
            const ok = or.some((cond) => {
              const contains = (value: unknown) =>
                typeof value === 'object' &&
                value !== null &&
                typeof (value as { contains?: unknown }).contains === 'string'
                  ? ((value as { contains: string }).contains as string)
                  : null;
              const codeContains = (value: unknown) => contains(value);
              if (typeof cond.code === 'object' && cond.code !== null) {
                const needle = codeContains(cond.code);
                if (needle && b.code.includes(needle)) return true;
              }
              if (cond.customer && typeof cond.customer === 'object') {
                const customer = DB.customers.find((c) => c.id === b.customerId)!;
                if (typeof (cond.customer as { code?: unknown }).code === 'object') {
                  const needle = codeContains(
                    (cond.customer as { code: unknown }).code,
                  );
                  if (needle && customer.code.includes(needle)) return true;
                }
                if (
                  Array.isArray((cond.customer as { OR?: unknown }).OR)
                ) {
                  const names = (cond.customer as { OR: Array<Record<string, unknown>> }).OR;
                  if (
                    names.some((n) => {
                      const firstName = contains(n.firstName);
                      const lastName = contains(n.lastName);
                      return (
                        (firstName !== null &&
                          (customer.firstName ?? '').toLowerCase().includes(firstName.toLowerCase())) ||
                        (lastName !== null &&
                          (customer.lastName ?? '').toLowerCase().includes(lastName.toLowerCase()))
                      );
                    })
                  )
                    return true;
                }
              }
              if (cond.departure && typeof cond.departure === 'object') {
                const departure = DB.departures.find((d) => d.id === b.departureId)!;
                const needle = codeContains((cond.departure as { code: unknown }).code);
                if (needle && departure.code.includes(needle)) return true;
              }
              if (cond.tour && typeof cond.tour === 'object') {
                const tour = DB.tours.find((t) => t.id === b.tourId)!;
                const needle = contains((cond.tour as { name: unknown }).name);
                if (
                  needle !== null &&
                  tour.name.toLowerCase().includes(needle.toLowerCase())
                )
                  return true;
              }
              return false;
            });
            if (!ok) return false;
          }
          return true;
        });
        if (orderBy?.createdAt === 'desc') {
          rows = [...rows].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }
        return rows.map(projectBooking);
      },
    ),
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; code: string } }) => {
        const row = DB.bookings.find(
          (b) => b.agencyId === where.agencyId && b.code === where.code,
        );
        if (!row) return null;
        return projectBookingDetail(row);
      },
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          code: string;
          agencyId: bigint;
          customerId: bigint;
          tourId: bigint;
          departureId: bigint;
          status: string;
          reservedSeats: number;
          currency: string;
          totalAmount: unknown;
          notes: string | null;
        };
      }) => {
        const row: BookingRow = {
          id: id(),
          code: data.code,
          agencyId: data.agencyId,
          customerId: data.customerId,
          tourId: data.tourId,
          departureId: data.departureId,
          status: data.status as BookingRow['status'],
          reservedSeats: data.reservedSeats,
          currency: data.currency,
          totalAmount: data.totalAmount,
          notes: data.notes,
          confirmedAt: null,
          cancelledAt: null,
          cancellationReason: null,
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.bookings.push(row);
        return { id: row.id, ...projectBooking(row) };
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Record<string, unknown>;
      }) => {
        const row = DB.bookings.find((b) => b.id === where.id)!;
        Object.assign(row, data);
        return { id: row.id };
      },
    ),
  },
  bookingPriceLine: {
    createMany: vi.fn(
      async ({
        data,
      }: {
        data: Array<{
          bookingId: bigint;
          pricingOptionId: bigint | null;
          optionCode: string;
          optionName: string;
          basis: string;
          currency: string;
          unitAmount: number;
          quantity: number;
          lineTotal: number;
        }>;
      }) => {
        for (const line of data) {
          DB.priceLines.push({
            id: id(),
            bookingId: line.bookingId,
            pricingOptionId: line.pricingOptionId,
            optionCode: line.optionCode,
            optionName: line.optionName,
            basis: line.basis,
            currency: line.currency,
            unitAmount: Number(line.unitAmount),
            quantity: line.quantity,
            lineTotal: Number(line.lineTotal),
          });
        }
        return { count: data.length };
      },
    ),
  },
  bookingStatusHistory: {
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          bookingId: bigint;
          fromStatus: string | null;
          toStatus: string;
          actorCode: string;
          reason: string | null;
        };
      }) => {
        const row: BookingStatusHistoryRow = {
          id: id(),
          bookingId: data.bookingId,
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          actorCode: data.actorCode,
          reason: data.reason,
          createdAt: NOW,
        };
        DB.statusHistory.push(row);
        return row;
      },
    ),
  },
  bookingTraveler: {
    count: vi.fn(
      async ({ where }: { where: { bookingId: bigint } }) =>
        DB.travelers.filter((t) => t.bookingId === where.bookingId).length,
    ),
    findMany: vi.fn(
      async ({
        where,
        orderBy,
      }: {
        where: { bookingId: bigint };
        orderBy?: { createdAt: 'asc' };
      }) => {
        let rows = DB.travelers.filter((t) => t.bookingId === where.bookingId);
        if (orderBy?.createdAt === 'asc') {
          rows = [...rows].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return rows.map(projectTraveler);
      },
    ),
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { code: string; bookingId: bigint };
        select: { id: true };
      }) => {
        const row = DB.travelers.find(
          (t) =>
            t.code === where.code && t.bookingId === where.bookingId,
        );
        if (!row) return null;
        return { id: row.id };
      },
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          code: string;
          bookingId: bigint;
          firstName: string;
          lastName: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
        };
      }) => {
        const row: TravelerRow = {
          id: id(),
          code: data.code,
          bookingId: data.bookingId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          notes: data.notes,
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.travelers.push(row);
        return projectTraveler(row);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Record<string, unknown>;
      }) => {
        const row = DB.travelers.find((t) => t.id === where.id)!;
        Object.assign(row, data);
        return projectTraveler(row);
      },
    ),
  },
  auditLog: {
    create: vi.fn(
      async ({
        data,
      }: {
        data: { action: string; targetCode?: string; agencyCode?: string; metadata?: unknown };
      }) => {
        DB.auditLog.push(data);
        return data;
      },
    ),
  },
  $queryRaw: vi.fn(async (_template: unknown, ...values: unknown[]) => {
    const queryText = String((_template as string[])?.[0] ?? '');
    if (queryText.includes('FROM booking')) {
      const bookingId = values[0] as bigint;
      const bookingRow = DB.bookings.find((b) => b.id === bookingId);
      if (!bookingRow) return [];
      return [
        {
          id: bookingRow.id,
          status: bookingRow.status,
          reserved_seats: bookingRow.reservedSeats,
        },
      ];
    }
    const departureId = values[0] as bigint;
    const row = DB.departures.find((d) => d.id === departureId);
    if (!row) return [];
    return [
      {
        id: row.id,
        tour_id: row.tourId,
        status: row.status,
        capacity: row.capacity,
        start_at: row.startAt,
        booking_deadline: row.bookingDeadline,
      },
    ];
  }),
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg !== 'function') return undefined;
    return arg(prismaMock);
  }),
};

function baseline(): void {
  DB.customers = [];
  DB.tours = [];
  DB.departures = [];
  DB.pricingOptions = [];
  DB.departurePrices = [];
  DB.bookings = [];
  DB.priceLines = [];
  DB.statusHistory = [];
  DB.travelers = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextCodeSeq = 1;
}

function seedAdminOwner(): void {
  DB.agencies.set(SAHARA.id, SAHARA);
  DB.agencies.set(ATLAS.id, ATLAS);
  addUser(admin);
  addUser(employee);
  const ownerRole = addRole('AGENCY_OWNER', 'AGENCY', SAHARA.id, [...ALL_BOOKING_PERMISSIONS]);
  addMembership(SAHARA.id, admin.id, [ownerRole.id]);
}

let app: INestApplication;
let adminToken: string;

const base = () => `/v1/agencies/${SAHARA.code}`;

function authHeader(token: string) {
  return { Cookie: `travel_access_token=${token}` };
}

function bookingPayload() {
  return {
    customerCode: 'CUS-000000000001',
    departureCode: 'DEP-000000000001',
    reservedSeats: 2,
    pricingSelections: ['PRC-000000000001'],
  };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          () => ({
            JWT_SECRET: 'test-secret',
            JWT_TTL: '1h',
            AUDIT_ENABLED: 'true',
          }),
        ],
      }),
      SecurityModule,
      AuthModule,
      AuthorizationModule,
      BookingsModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  adminToken = app.get(JwtService).sign({ sub: admin.id.toString() });
});

beforeEach(() => {
  baseline();
  seedAdminOwner();
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('if the caller is not authenticated', () => {
  it('401 on bookings endpoints', async () => {
    await request(app.getHttpServer()).get(`${base()}/bookings`).expect(401);
    await request(app.getHttpServer())
      .get(`${base()}/bookings/BKG-000000000001`)
      .expect(401);
  });
});

describe('if the caller is authenticated but not a member of the agency', () => {
  it('403 on bookings endpoints', async () => {
    DB.memberships = [];

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .expect(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });
});

describe('if the matching permission is missing', () => {
  it('403 on the bookings endpoints', async () => {
    const viewerRole = addRole(
      'AGENCY_VIEWER',
      'AGENCY',
      SAHARA.id,
      [...VIEW_ONLY_PERMISSIONS],
    );
    addMembership(SAHARA.id, employee.id, [viewerRole.id]);
    const token = app.get(JwtService).sign({ sub: employee.id.toString() });

    await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(token))
      .send(bookingPayload())
      .expect(403);
  });
});

describe('if the agency membership is suspended', () => {
  it('403 on bookings endpoints', async () => {
    addMembership(SAHARA.id, employee.id, [], { status: 'SUSPENDED' });
    const token = app.get(JwtService).sign({ sub: employee.id.toString() });

    await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .set(authHeader(token))
      .expect(403);
  });
});

describe('POST /v1/agencies/:agencyCode/bookings', () => {
  it('creates a PENDING booking with a server-computed total and a frozen price snapshot', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { capacity: 12 });
    const customer = addCustomer(SAHARA.id);
    const adult = addPricingOption(tour.id, {
      code: 'PRC-000000000001',
      name: 'Adult',
      basis: 'per_person',
      currency: 'DZD',
    });
    const single = addPricingOption(tour.id, {
      code: 'PRC-000000000002',
      name: 'Single supplement',
      basis: 'per_booking',
      currency: 'DZD',
    });
    addDeparturePrice(departure.id, adult.id, 96000);
    addDeparturePrice(departure.id, single.id, 12000);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 2,
        pricingSelections: [
          adult.code,
          single.code,
        ],
        notes: 'Window seats',
      })
      .expect(201);

    expect(res.body.code).toMatch(/^BKG-[0-9A-F]{12}$/);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.reservedSeats).toBe(2);
    expect(res.body.currency).toBe('DZD');
    expect(res.body.totalAmount).toBe(204000);
    expect(res.body.notes).toBe('Window seats');
    expect(res.body.confirmedAt).toBeNull();
    expect(res.body.cancelledAt).toBeNull();
    expect(res.body.customer).toEqual({
      code: customer.code,
      firstName: customer.firstName,
      lastName: customer.lastName,
    });
    expect(res.body.tour).toEqual({
      code: tour.code,
      name: tour.name,
    });
    expect(res.body.departure).toEqual({
      code: departure.code,
      startAt: departure.startAt.toISOString(),
    });

    const created = DB.bookings[0]!;
    expect(DB.priceLines).toHaveLength(2);
    expect(DB.priceLines[0]).toMatchObject({
      bookingId: created.id,
      optionCode: adult.code,
      basis: 'per_person',
      currency: 'DZD',
      unitAmount: 96000,
      quantity: 2,
      lineTotal: 192000,
    });
    expect(DB.priceLines[1]).toMatchObject({
      optionCode: single.code,
      basis: 'per_booking',
      unitAmount: 12000,
      quantity: 1,
      lineTotal: 12000,
    });

    expect(DB.statusHistory).toHaveLength(1);
    expect(DB.statusHistory[0]).toMatchObject({
      bookingId: created.id,
      fromStatus: null,
      toStatus: 'PENDING',
      actorCode: admin.code,
    });

    const audit = DB.auditLog.find((a) => a.action === 'AGENCY_BOOKING_CREATED');
    expect(audit?.targetCode).toBe(created.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
    expect(JSON.stringify(res.body)).not.toContain('"id"');
    expect(JSON.stringify(res.body)).not.toContain('"agencyId"');
  });

  it('supports a zero-selection booking in the default currency', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(201);

    expect(res.body.currency).toBe('DZD');
    expect(res.body.totalAmount).toBe(0);
    expect(DB.priceLines).toHaveLength(0);
  });

  it('400 when the client tries to set the status or a total amount', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);

    await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        status: 'CONFIRMED',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        totalAmount: 10,
      })
      .expect(400);
  });

  it('400 on a malformed body', async () => {
    await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({ departureCode: 'DEP-000000000001' })
      .expect(400);
  });

  it('404 when the customer is not in this agency', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    addCustomer(ATLAS.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: 'CUS-000000000001',
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(404);

    expect(res.body.errorCode).toBe('CUSTOMER_NOT_FOUND');
  });

  it('404 when the departure is not in this agency', async () => {
    const departure = { code: 'DEP-000000000001' };
    addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: 'CUS-000000000001',
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(404);

    expect(res.body.errorCode).toBe('DEPARTURE_NOT_FOUND');
  });

  it('409 when the customer is archived', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id, { status: 'ARCHIVED' });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('CUSTOMER_ARCHIVED');
  });

  it('409 when the tour is archived', async () => {
    const tour = addTour(SAHARA.id, { status: 'ARCHIVED' });
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_TOUR_ARCHIVED');
  });

  it('409 when the departure is not OPEN', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { status: 'CLOSED' });
    const customer = addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_DEPARTURE_NOT_OPEN');
  });

  it('409 when the booking deadline passed', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, {
      bookingDeadline: new Date('2026-09-19T00:00:00.000Z'),
    });
    const customer = addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_DEADLINE_PASSED');
  });

  it('409 when the departure already started', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, {
      startAt: new Date('2026-09-01T08:00:00.000Z'),
    });
    const customer = addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_DEPARTURE_STARTED');
  });

  it('409 when the reserved seats exceed the remaining capacity', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { capacity: 4 });
    const customer = addCustomer(SAHARA.id);
    addBooking(departure, tour, customer, { status: 'PENDING', reservedSeats: 3 });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 2,
        pricingSelections: [],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_CAPACITY_EXCEEDED');
    expect(DB.bookings).toHaveLength(1);
  });

  it('counts only active statuses towards capacity (CANCELLED seats are released)', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { capacity: 4 });
    const customer = addCustomer(SAHARA.id);
    addBooking(departure, tour, customer, { status: 'CANCELLED', reservedSeats: 3 });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 2,
        pricingSelections: [],
      })
      .expect(201);

    expect(res.body.reservedSeats).toBe(2);
  });

  it('404 when a pricing option does not exist on the departure', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: ['PRC-000000000099'],
      })
      .expect(404);

    expect(res.body.errorCode).toBe('BOOKING_PRICE_OPTION_NOT_FOUND');
  });

  it('409 when a pricing option is inactive', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const inactive = addPricingOption(tour.id, { status: 'INACTIVE' });
    addDeparturePrice(departure.id, inactive.id, 500);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [inactive.code],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_PRICE_OPTION_INACTIVE');
  });

  it('409 when the selections mix currencies', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const local = addPricingOption(tour.id, { currency: 'DZD' });
    const foreign = addPricingOption(tour.id, { currency: 'EUR' });
    addDeparturePrice(departure.id, local.id, 96000);
    addDeparturePrice(departure.id, foreign.id, 8000);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [
          local.code,
          foreign.code,
        ],
      })
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_CURRENCY_MISMATCH');
  });

  it('400 on a duplicate pricing option code', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const adult = addPricingOption(tour.id);
    addDeparturePrice(departure.id, adult.id, 96000);

    await request(app.getHttpServer())
      .post(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .send({
        customerCode: customer.code,
        departureCode: departure.code,
        reservedSeats: 1,
        pricingSelections: [
          adult.code,
          adult.code,
        ],
      })
      .expect(400);
  });
});

describe('GET /v1/agencies/:agencyCode/bookings', () => {
  it('lists bookings newest first without leaking internal ids', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const b1 = addBooking(departure, tour, customer, { createdAt: new Date('2026-09-01T00:00:00Z') });
    const b2 = addBooking(departure, tour, customer, { createdAt: new Date('2026-09-10T00:00:00Z'), status: 'CONFIRMED' });

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].code).toBe(b2.code);
    expect(res.body[1].code).toBe(b1.code);
    expect(JSON.stringify(res.body)).not.toContain('"id"');
    expect(JSON.stringify(res.body)).not.toContain('"agencyId"');
  });

  it('filters by status and customer and departure codes', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const amal = addCustomer(SAHARA.id);
    const youcef = addCustomer(SAHARA.id);
    addBooking(departure, tour, amal, { status: 'CONFIRMED' });
    addBooking(departure, tour, youcef, { status: 'CANCELLED' });

    const byStatus = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ status: 'CONFIRMED' })
      .set(authHeader(adminToken))
      .expect(200);
    expect(byStatus.body).toHaveLength(1);
    expect(byStatus.body[0].customer.code).toBe(amal.code);

    const byCustomer = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ customerCode: youcef.code })
      .set(authHeader(adminToken))
      .expect(200);
    expect(byCustomer.body).toHaveLength(1);
    expect(byCustomer.body[0].status).toBe('CANCELLED');

    const byDeparture = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ departureCode: departure.code })
      .set(authHeader(adminToken))
      .expect(200);
    expect(byDeparture.body).toHaveLength(2);
  });

  it('searches across customer, tour and departure fields', async () => {
    const tour = addTour(SAHARA.id, { code: 'TUR-000000000001' });
    const departure = addDeparture(tour.id, { code: 'DEP-000000000001' });
    const customer = addCustomer(SAHARA.id, { code: 'CUS-000000000001' });
    addBooking(departure, tour, customer);

    const byCustomer = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ search: 'Benali' })
      .set(authHeader(adminToken))
      .expect(200);
    expect(byCustomer.body).toHaveLength(1);

    const byTour = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ search: 'Algiers by night' })
      .set(authHeader(adminToken))
      .expect(200);
    expect(byTour.body).toHaveLength(1);

    const byDeparture = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ search: 'DEP-000000000001' })
      .set(authHeader(adminToken))
      .expect(200);
    expect(byDeparture.body).toHaveLength(1);

    const noMatch = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .query({ search: 'CUS-000000000001' })
      .set(authHeader(adminToken))
      .expect(200);
    expect(noMatch.body).toHaveLength(0);
  });

  it('isolates agencies: a caller cannot see another agency bookings', async () => {
    addMembership(SAHARA.id, employee.id, [], { status: 'ACTIVE' });

    const otherTour = addTour(ATLAS.id);
    const otherDeparture = addDeparture(otherTour.id);
    const otherCustomer = addCustomer(ATLAS.id);
    addBooking(otherDeparture, otherTour, otherCustomer);

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('GET /v1/agencies/:agencyCode/bookings/:bookingCode', () => {
  it('reads the detail with price lines and status history', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer);
    addPriceLine(booking.id, {
      unitAmount: 96000,
      quantity: 2,
      lineTotal: 192000,
      optionCode: 'PRC-000000000001',
    });
    addPriceLine(booking.id, {
      optionCode: 'PRC-000000000002',
      basis: 'per_booking',
      unitAmount: 12000,
      quantity: 1,
      lineTotal: 12000,
    });
    addStatusHistory(booking.id, { fromStatus: null, toStatus: 'PENDING' });

    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/${booking.code}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(res.body.code).toBe(booking.code);
    expect(res.body.priceLines).toHaveLength(2);
    expect(res.body.priceLines[0]).toMatchObject({
      pricingOptionCode: 'PRC-000000000001',
      unitAmount: 96000,
      quantity: 2,
      lineTotal: 192000,
    });
    expect(res.body.priceLines[1]).toMatchObject({
      basis: 'per_booking',
      unitAmount: 12000,
      quantity: 1,
      lineTotal: 12000,
    });
    expect(res.body.statusHistory).toHaveLength(1);
    expect(res.body.statusHistory[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'PENDING',
      actorCode: admin.code,
    });
    expect(JSON.stringify(res.body)).not.toContain('"agencyId"');
  });

  it('404 for an unknown booking code', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base()}/bookings/BKG-000000000099`)
      .set(authHeader(adminToken))
      .expect(404);
    expect(res.body.errorCode).toBe('BOOKING_NOT_FOUND');
  });
});

describe('POST /v1/agencies/:agencyCode/bookings/:bookingCode/confirm', () => {
  it('409 BOOKING_TRAVELER_COUNT_MISMATCH until the manifest matches reservedSeats', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer, {
      status: 'PENDING',
      reservedSeats: 2,
    });
    addTraveler(booking.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/confirm`)
      .set(authHeader(adminToken))
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_TRAVELER_COUNT_MISMATCH');
    expect(res.body.expected).toBe(2);
    expect(res.body.actual).toBe(1);
    expect(DB.bookings[0]!.status).toBe('PENDING');
  });

  it('confirms a PENDING booking when traveler count matches reservedSeats', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer, {
      status: 'PENDING',
      reservedSeats: 2,
    });
    addTraveler(booking.id);
    addTraveler(booking.id);
    addStatusHistory(booking.id);

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/confirm`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.confirmedAt).toBeTruthy();
    expect(res.body.reservedSeats).toBe(2);

    expect(DB.bookings[0]!.status).toBe('CONFIRMED');
    expect(DB.statusHistory).toHaveLength(2);
    expect(DB.statusHistory[1]).toMatchObject({
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      actorCode: admin.code,
    });

    const audit = DB.auditLog.find((a) => a.action === 'AGENCY_BOOKING_CONFIRMED');
    expect(audit?.targetCode).toBe(booking.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
  });

  it('409 when the booking is already confirmed', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer, { status: 'CONFIRMED' });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/confirm`)
      .set(authHeader(adminToken))
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_ALREADY_CONFIRMED');
  });

  it('409 on an invalid transition', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer, { status: 'CANCELLED' });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/confirm`)
      .set(authHeader(adminToken))
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_INVALID_TRANSITION');
  });

  it('404 for an unknown booking code', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/BKG-000000000099/confirm`)
      .set(authHeader(adminToken))
      .expect(404);
    expect(res.body.errorCode).toBe('BOOKING_NOT_FOUND');
  });
});

describe('POST /v1/agencies/:agencyCode/bookings/:bookingCode/cancel', () => {
  it('cancels a PENDING booking one-way and releases its seats', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id, { capacity: 4 });
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer, {
      status: 'PENDING',
      reservedSeats: 2,
    });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/cancel`)
      .set(authHeader(adminToken))
      .send({ reason: 'Changed plans' })
      .expect(200);

    expect(res.body.status).toBe('CANCELLED');
    expect(res.body.cancelledAt).toBeTruthy();
    expect(res.body.cancellationReason).toBe('Changed plans');
    expect(res.body.totalAmount).toBe(192000);

    expect(DB.bookings[0]!.status).toBe('CANCELLED');
    expect(DB.statusHistory).toHaveLength(1);
    expect(DB.statusHistory[0]).toMatchObject({
      fromStatus: 'PENDING',
      toStatus: 'CANCELLED',
      actorCode: admin.code,
      reason: 'Changed plans',
    });

    const audit = DB.auditLog.find((a) => a.action === 'AGENCY_BOOKING_CANCELLED');
    expect(audit?.targetCode).toBe(booking.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
  });

  it('409 when the booking is already cancelled', async () => {
    const tour = addTour(SAHARA.id);
    const departure = addDeparture(tour.id);
    const customer = addCustomer(SAHARA.id);
    const booking = addBooking(departure, tour, customer, { status: 'CANCELLED' });

    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/${booking.code}/cancel`)
      .set(authHeader(adminToken))
      .send({})
      .expect(409);

    expect(res.body.errorCode).toBe('BOOKING_ALREADY_CANCELLED');
  });

  it('404 for an unknown booking code', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base()}/bookings/BKG-000000000099/cancel`)
      .set(authHeader(adminToken))
      .send({})
      .expect(404);
    expect(res.body.errorCode).toBe('BOOKING_NOT_FOUND');
  });
});