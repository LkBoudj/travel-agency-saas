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
import { ToursModule } from './tours.module.js';

/**
 * Agency tours over HTTP, through the real agency authorization guard.
 *
 * The in-memory Prisma double models the pieces this domain depends on: the
 * agency (status + memberships), the tour aggregate (with its embedded ordered
 * destinations and itinerary), and the audit log. The CHECK constraints and the
 * (tour_id, position) uniqueness live in the migration and are verified against
 * PostgreSQL there, not here.
 */

type TourRow = {
  id: bigint;
  agencyId: bigint;
  code: string;
  name: string;
  internalRef: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  format: string;
  geographicScope: string;
  availabilityMode: string;
  participationMode: string | null;
  guidanceType: string | null;
  days: number | null;
  nights: number | null;
  hours: number | null;
  isFlexible: boolean;
  minTravelers: number;
  languages: string[];
  themes: string[];
  activities: string[];
  audiences: string[];
  transportModes: string[];
  accommodationTypes: string[];
  activityRequirements: unknown;
  shortDescription: string | null;
  description: string | null;
  highlights: unknown;
  included: unknown;
  notIncluded: unknown;
  importantInformation: string | null;
  cancellationPolicy: string | null;
  meetingPoint: string | null;
  meetingInstructions: string | null;
  coverImageUrl: string | null;
  gallery: unknown;
  origin: unknown;
  destinations: Array<{ wilayaCode: string | null; locality: string | null; place: string | null }>;
  itinerary: Array<{ title: string; location: string; description: string }>;
  createdAt: Date;
  updatedAt: Date;
};

type DestinationCreateRow = { position: number; wilayaCode: string | null; locality: string | null; place: string | null };
type ItineraryCreateRow = { position: number; title: string; location: string; description: string };

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

type DepartureRow = {
  id: bigint;
  tourId: bigint;
  code: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  startAt: Date;
  endAt: Date;
  capacity: number;
  bookingDeadline: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const NOW = new Date('2026-09-20T10:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };

const DB = {
  tours: [] as TourRow[],
  departures: [] as DepartureRow[],
  departurePrices: [] as Array<{ tourId: bigint; departureStatus: DepartureRow['status']; amount: number }>,
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  auditLog: [] as Array<{ action: string; targetCode?: string; agencyCode?: string }>,
};

let nextId = 100n;
let nextTourCode = 1;
let nextDepartureCode = 1;
function id(): bigint {
  const value = nextId;
  nextId += 1n;
  return value;
}

function tourCode(): string {
  const value = (nextTourCode++).toString(16).padStart(12, '0').toUpperCase();
  return `TUR-${value}`;
}

function departureCode(): string {
  const value = (nextDepartureCode++).toString(16).padStart(12, '0').toUpperCase();
  return `DEP-${value}`;
}

function addDeparture(
  tourId: bigint,
  overrides: Partial<Omit<DepartureRow, 'id' | 'tourId' | 'code'> & { code?: string }> = {},
): DepartureRow {
  const row: DepartureRow = {
    id: id(),
    tourId,
    code: overrides.code ?? departureCode(),
    status: 'OPEN',
    startAt: new Date('2026-12-20T08:00:00.000Z'),
    endAt: new Date('2026-12-20T18:00:00.000Z'),
    capacity: 12,
    bookingDeadline: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.departures.push(row);
  return row;
}

/** A stored departure price, joined to a departure by tour when aggregating. */
function addDeparturePrice(
  tourId: bigint,
  departureStatus: DepartureRow['status'],
  amount: number,
): void {
  DB.departurePrices.push({ tourId, departureStatus, amount });
}

function addRole(
  key: string,
  scope: string,
  agencyId: bigint | null,
  permissionKeys: string[] = [],
  name = key,
): RoleRow {
  const row: RoleRow = { id: id(), key, name, description: `${name} description`, scope, agencyId, permissionKeys };
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

function addTour(
  agencyId: bigint,
  overrides: Partial<Omit<TourRow, 'id' | 'agencyId' | 'code'> & { code?: string }> = {},
): TourRow {
  const row: TourRow = {
    id: id(),
    agencyId,
    code: overrides.code ?? tourCode(),
    name: 'Tikjda Hiking Day',
    internalRef: null,
    status: 'DRAFT',
    format: 'day_excursion',
    geographicScope: 'domestic',
    availabilityMode: 'on_request',
    participationMode: null,
    guidanceType: null,
    days: 1,
    nights: null,
    hours: 8,
    isFlexible: false,
    minTravelers: 1,
    languages: ['fr'],
    themes: [],
    activities: [],
    audiences: [],
    transportModes: [],
    accommodationTypes: [],
    activityRequirements: null,
    shortDescription: null,
    description: null,
    highlights: [],
    included: [],
    notIncluded: [],
    importantInformation: null,
    cancellationPolicy: null,
    meetingPoint: null,
    meetingInstructions: null,
    coverImageUrl: null,
    gallery: [],
    origin: { wilayaCode: '16', place: null },
    destinations: [{ wilayaCode: '16', locality: 'Béjaïa', place: 'Tikjda' }],
    itinerary: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.tours.push(row);
  return row;
}

/** A complete, publishable (on_request) payload. */
function readyPayload() {
  return {
    name: 'Tikjda Hiking Day',
    internalRef: 'TIK-1D-001',
    format: 'day_excursion',
    geographicScope: 'domestic',
    availabilityMode: 'on_request',
    participationMode: null,
    guidanceType: null,
    origin: { wilayaCode: '16', place: 'Sétif' },
    destinations: [{ wilayaCode: '16', cityId: 'Béjaïa', place: 'Tikjda' }],
    days: 1,
    nights: null,
    hours: 8,
    isFlexible: false,
    minTravelers: 1,
    languages: ['fr', 'ar'],
    themes: ['nature'],
    activities: ['hiking'],
    audiences: ['friends'],
    transportModes: ['bus'],
    accommodationTypes: [],
    activityRequirements: { difficulty: 'easy' },
    shortDescription: 'A full-day guided hike on the Djurdjura ridge.',
    description: 'Long description',
    highlights: [{ text: 'Summit views' }],
    itinerary: [
      { title: 'Departure', location: 'Sétif', description: 'Morning pickup' },
      { title: 'Ascent', location: 'Tikjda', description: 'Guided climb' },
    ],
    included: [{ text: 'Guide' }],
    notIncluded: [{ text: 'Lunch' }],
    importantInformation: 'Bring warm layers',
    cancellationPolicy: 'Free up to 48h',
    meetingPoint: 'Bus station',
    meetingInstructions: 'Be there 15 minutes early',
    coverImageUrl: 'https://cdn.example.com/tikjda.jpg',
    gallery: [{ url: 'https://cdn.example.com/tikjda-1.jpg' }],
  };
}

function tourMatches(tour: TourRow, searchWhere: Array<Record<string, unknown>>): boolean {
  const containsFrom = (field: unknown, path: string): string | undefined => {
    const node = (field as Record<string, unknown>)?.[path];
    return node && typeof node === 'object' ? (node as { contains?: string }).contains : undefined;
  };
  for (const clause of searchWhere) {
    const code = containsFrom(clause, 'code');
    if (code && tour.code.toLowerCase().includes(code.toLowerCase())) return true;
    const name = containsFrom(clause, 'name');
    if (name && tour.name.toLowerCase().includes(name.toLowerCase())) return true;
    const internalRef = containsFrom(clause, 'internalRef');
    if (internalRef && tour.internalRef?.toLowerCase().includes(internalRef.toLowerCase())) return true;
    const destinationWo = clause.destinations as
      | { some?: { OR?: Array<Record<string, { contains?: string }>> } }
      | undefined;
    const term = destinationWo?.some?.OR?.[0]?.locality?.contains ?? destinationWo?.some?.OR?.[0]?.place?.contains;
    if (
      term &&
      tour.destinations.some(
        (d) =>
          d.locality?.toLowerCase().includes(term.toLowerCase()) ||
          d.place?.toLowerCase().includes(term.toLowerCase()),
      )
    ) {
      return true;
    }
  }
  return false;
}

function applyWhere(tours: TourRow[], where: {
  agencyId: bigint;
  status?: string | { not: string };
  OR?: Array<Record<string, unknown>>;
}): TourRow[] {
  let rows = tours.filter((t) => t.agencyId === where.agencyId);
  const status = where.status;
  if (typeof status === 'string') {
    rows = rows.filter((t) => t.status === status);
  } else if (status) {
    rows = rows.filter((t) => t.status !== status.not);
  }
  if (where.OR?.length) rows = rows.filter((t) => tourMatches(t, where.OR));
  return rows;
}

function projectTour(t: TourRow) {
  return { ...t };
}

const prismaMock = {
  appUser: {
    findUnique: vi.fn(
      async ({ where }: { where: { id?: bigint; code?: string; email?: string } }) => {
        const user = [...DB.users.values()].find(
          (u) =>
            (where.id !== undefined && u.id === where.id) ||
            (where.code !== undefined && u.code === where.code) ||
            (where.email !== undefined && u.email === where.email),
        );
        return user ? { ...user } : null;
      },
    ),
  },
  role: {
    findMany: vi.fn(
      async ({ where }: { where: { key?: { in: string[] }; scope?: string; OR?: unknown[] } }) => {
        let rows = [...DB.roles.values()];
        if (where.key?.in) rows = rows.filter((r) => where.key!.in.includes(r.key));
        if (where.scope) rows = rows.filter((r) => r.scope === where.scope);
        if (where.OR) {
          const allowed = (where.OR as Array<{ agencyId: bigint | null }>).map((o) => o.agencyId);
          rows = rows.filter((r) => allowed.some((a) => a === r.agencyId));
        }
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          scope: r.scope,
          agencyId: r.agencyId,
        }));
      },
    ),
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
  agencyMembership: {
    findMany: vi.fn(async () => []),
  },
  tour: {
    findMany: vi.fn(
      async ({ where }: { where: Parameters<typeof applyWhere>[1] }) =>
        applyWhere(DB.tours, where).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(projectTour),
    ),
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; code: string } }) => {
        const row = DB.tours.find((t) => t.agencyId === where.agencyId && t.code === where.code);
        return row ? projectTour(row) : null;
      },
    ),
    create: vi.fn(
      async ({ data }: { data: Record<string, unknown> & { destinations?: { create?: DestinationCreateRow[] }; itinerary?: { create?: ItineraryCreateRow[] } } }) => {
        const row: TourRow = {
          id: id(),
          agencyId: data.agencyId as bigint,
          code: data.code as string,
          name: data.name as string,
          internalRef: (data.internalRef as string | null) ?? null,
          status: 'DRAFT',
          format: data.format as string,
          geographicScope: data.geographicScope as string,
          availabilityMode: data.availabilityMode as string,
          participationMode: (data.participationMode as string | null) ?? null,
          guidanceType: (data.guidanceType as string | null) ?? null,
          days: (data.days as number | null) ?? null,
          nights: (data.nights as number | null) ?? null,
          hours: (data.hours as number | null) ?? null,
          isFlexible: data.isFlexible as boolean,
          minTravelers: data.minTravelers as number,
          languages: (data.languages as string[]) ?? [],
          themes: (data.themes as string[]) ?? [],
          activities: (data.activities as string[]) ?? [],
          audiences: (data.audiences as string[]) ?? [],
          transportModes: (data.transportModes as string[]) ?? [],
          accommodationTypes: (data.accommodationTypes as string[]) ?? [],
          activityRequirements: data.activityRequirements ?? null,
          shortDescription: (data.shortDescription as string | null) ?? null,
          description: (data.description as string | null) ?? null,
          highlights: data.highlights ?? [],
          included: data.included ?? [],
          notIncluded: data.notIncluded ?? [],
          importantInformation: (data.importantInformation as string | null) ?? null,
          cancellationPolicy: (data.cancellationPolicy as string | null) ?? null,
          meetingPoint: (data.meetingPoint as string | null) ?? null,
          meetingInstructions: (data.meetingInstructions as string | null) ?? null,
          coverImageUrl: (data.coverImageUrl as string | null) ?? null,
          gallery: data.gallery ?? [],
          origin: data.origin ?? { wilayaCode: null, locality: null, place: null },
          destinations: [...(data.destinations?.create ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((d) => ({ wilayaCode: d.wilayaCode, locality: d.locality, place: d.place })),
          itinerary: [...(data.itinerary?.create ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((d) => ({ title: d.title, location: d.location, description: d.description })),
          createdAt: NOW,
          updatedAt: NOW,
        };
        DB.tours.push(row);
        return projectTour(row);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Record<string, unknown> & {
          destinations?: { deleteMany?: unknown; create?: DestinationCreateRow[] };
          itinerary?: { deleteMany?: unknown; create?: ItineraryCreateRow[] };
        };
      }) => {
        const row = DB.tours.find((r) => r.id === where.id);
        if (!row) throw new Error('tour.update called with an unknown id');
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          if (key === 'destinations') {
            row.destinations = [...((value as { create?: DestinationCreateRow[] }).create ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((d) => ({ wilayaCode: d.wilayaCode, locality: d.locality, place: d.place }));
          } else if (key === 'itinerary') {
            row.itinerary = [...((value as { create?: ItineraryCreateRow[] }).create ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((d) => ({ title: d.title, location: d.location, description: d.description }));
          } else {
            (row as unknown as Record<string, unknown>)[key] = value;
          }
        }
        return projectTour(row);
      },
    ),
  },
  departure: {
    count: vi.fn(
      async ({ where }: { where: { tourId: bigint; status: string } }) =>
        DB.departures.filter((d) => d.tourId === where.tourId && d.status === where.status)
          .length,
    ),
  },
  departurePrice: {
    aggregate: vi.fn(
      async ({ where }: { where: { departure: { tourId: bigint; status: string } } }) => {
        const rows = DB.departurePrices.filter(
          (p) =>
            p.tourId === where.departure.tourId && p.departureStatus === where.departure.status,
        );
        const amounts = rows.map((p) => p.amount);
        return { _min: { amount: amounts.length === 0 ? null : Math.min(...amounts) } };
      },
    ),
  },
  auditLog: {
    create: vi.fn(
      async ({ data }: { data: { action: string; targetCode?: string | null; agencyCode?: string | null } }) => {
        DB.auditLog.push({
          action: data.action,
          targetCode: data.targetCode ?? undefined,
          agencyCode: data.agencyCode ?? undefined,
        });
        return { id: 1n };
      },
    ),
  },
};

function baseline(): void {
  DB.tours = [];
  DB.departures = [];
  DB.departurePrices = [];
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.auditLog = [];
  nextId = 100n;
  nextTourCode = 1;
  nextDepartureCode = 1;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  for (const seed of [admin, employee]) addUser(seed);
}

/** Every tour permission, so authorization is never the thing under test. */
const ALL_TOUR_PERMISSIONS = [
  'AGENCY_TOUR_VIEW',
  'AGENCY_TOUR_CREATE',
  'AGENCY_TOUR_UPDATE',
  'AGENCY_TOUR_PUBLISH',
  'AGENCY_TOUR_DELETE',
];

describe('Agency tours API', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        AuthorizationModule,
        SecurityModule,
        ToursModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    adminToken = jwt.sign({ sub: admin.id.toString() });
    employeeToken = jwt.sign({ sub: employee.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const cookie = (v: string) => `travel_access_token=${v}`;
  const as = (token: string) => ({
    get: (p: string) => request(app.getHttpServer()).get(p).set('Cookie', cookie(token)),
    post: (p: string) => request(app.getHttpServer()).post(p).set('Cookie', cookie(token)),
    put: (p: string) => request(app.getHttpServer()).put(p).set('Cookie', cookie(token)),
    patch: (p: string) => request(app.getHttpServer()).patch(p).set('Cookie', cookie(token)),
  });

  const base = (code = SAHARA.code) => `/v1/agencies/${code}`;

  /** Makes the caller an owner holding every tour permission. */
  function seedAdminOwner(): void {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ALL_TOUR_PERMISSIONS, 'Agency Owner');
    addMembership(SAHARA.id, admin.id, [role.id], { membershipType: 'OWNER' });
  }

  // ------------------------------------------------------------ authorization

  it('401 without a JWT', async () => {
    expect((await request(app.getHttpServer()).get(`${base()}/tours`)).status).toBe(401);
  });

  it('403 without the required tour permission', async () => {
    const role = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_AGENCY_VIEW']);
    addMembership(SAHARA.id, admin.id, [role.id]);

    const res = await as(adminToken).get(`${base()}/tours`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('403 when the agency is suspended', async () => {
    seedAdminOwner();
    DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';

    const res = await as(adminToken).get(`${base()}/tours`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
  });

  it('403 on create/update/publish/archive when the matching permission is missing', async () => {
    const viewOnly = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_TOUR_VIEW']);
    addMembership(SAHARA.id, employee.id, [viewOnly.id]);
    const tour = addTour(SAHARA.id);

    const create = await as(employeeToken).post(`${base()}/tours`).send(readyPayload());
    expect(create.status).toBe(403);
    expect(create.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');

    const update = await as(employeeToken).put(`${base()}/tours/${tour.code}`).send(readyPayload());
    expect(update.status).toBe(403);

    const publish = await as(employeeToken).post(`${base()}/tours/${tour.code}/publish`);
    expect(publish.status).toBe(403);

    const unpublish = await as(employeeToken).post(`${base()}/tours/${tour.code}/unpublish`);
    expect(unpublish.status).toBe(403);

    const archive = await as(employeeToken).patch(`${base()}/tours/${tour.code}/archive`);
    expect(archive.status).toBe(403);
    expect(DB.tours[0]!.status).toBe('DRAFT');
  });

  // -------------------------------------------------------------------- create

  it('creates a tour draft with a backend code, ordered destinations and audit', async () => {
    seedAdminOwner();

    const res = await as(adminToken).post(`${base()}/tours`).send(readyPayload());

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^TUR-[0-9A-F]{12}$/);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body).toMatchObject({
      name: 'Tikjda Hiking Day',
      format: 'day_excursion',
      geographicScope: 'domestic',
      availabilityMode: 'on_request',
      minTravelers: 1,
      shortDescription: 'A full-day guided hike on the Djurdjura ridge.',
      origin: { wilayaCode: '16', place: 'Sétif' },
      destinations: [{ wilayaCode: '16', cityId: 'Béjaïa', place: 'Tikjda' }],
      itinerary: [
        { title: 'Departure', location: 'Sétif', description: 'Morning pickup' },
        { title: 'Ascent', location: 'Tikjda', description: 'Guided climb' },
      ],
      highlights: [{ text: 'Summit views' }],
      coverImageUrl: 'https://cdn.example.com/tikjda.jpg',
    });
    expect(DB.tours).toHaveLength(1);

    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_TOUR_CREATED');
    expect(audit?.targetCode).toBe(res.body.code);
    expect(audit?.agencyCode).toBe(SAHARA.code);
  });

  it('400 on an invalid body and stores nothing', async () => {
    seedAdminOwner();

    const noName = await as(adminToken)
      .post(`${base()}/tours`)
      .send({ ...readyPayload(), name: '   ' });
    expect(noName.status).toBe(400);

    const noDestinations = await as(adminToken)
      .post(`${base()}/tours`)
      .send({ ...readyPayload(), destinations: [] });
    expect(noDestinations.status).toBe(400);

    const badDays = await as(adminToken)
      .post(`${base()}/tours`)
      .send({ ...readyPayload(), duration: { days: -2 } });
    expect(badDays.status).toBe(400);

    expect(DB.tours).toHaveLength(0);
  });

  // -------------------------------------------------------------------- list

  it('lists DRAFT and PUBLISHED tours, newest first, never archived by default', async () => {
    seedAdminOwner();
    addTour(SAHARA.id, { name: 'Old Tour', createdAt: new Date('2026-01-01T00:00:00.000Z') });
    addTour(SAHARA.id, {
      name: 'Newer Tour',
      status: 'PUBLISHED',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    addTour(SAHARA.id, { name: 'Gone Tour', status: 'ARCHIVED' });

    const res = await as(adminToken).get(`${base()}/tours`);

    expect(res.status).toBe(200);
    expect(res.body.map((t: { name: string }) => t.name)).toEqual(['Newer Tour', 'Old Tour']);
    expect(res.body.map((t: { name: string }) => t.name)).not.toContain('Gone Tour');
  });

  it('filters by status, searches by name and by destination', async () => {
    seedAdminOwner();
    addTour(SAHARA.id, { name: 'Sahara Dunes', destinations: [{ wilayaCode: '01', locality: 'Tikjda', place: 'Guelmima' }] });
    addTour(SAHARA.id, { name: 'Atlas Peaks', destinations: [{ wilayaCode: '09', locality: 'Bouira', place: 'Tikjda' }] });
    addTour(SAHARA.id, { name: 'Archived Trip', status: 'ARCHIVED' });

    const byName = await as(adminToken).get(`${base()}/tours?search=atlas`);
    expect(byName.status).toBe(200);
    expect(byName.body).toHaveLength(1);
    expect(byName.body[0].name).toBe('Atlas Peaks');

    const byPlace = await as(adminToken).get(`${base()}/tours?search=tikjda`);
    expect(byPlace.status).toBe(200);
    expect(byPlace.body.map((t: { name: string }) => t.name)).toEqual(['Sahara Dunes', 'Atlas Peaks']);

    const byCode = await as(adminToken).get(`${base()}/tours?search=${DB.tours[0]!.code}`);
    expect(byCode.status).toBe(200);
    expect(byCode.body).toHaveLength(1);

    const archived = await as(adminToken).get(`${base()}/tours?status=ARCHIVED`);
    expect(archived.status).toBe(200);
    expect(archived.body).toHaveLength(1);
    expect(archived.body[0].name).toBe('Archived Trip');
  });

  it('never leaks database internals', async () => {
    seedAdminOwner();
    addTour(SAHARA.id);
    addTour(SAHARA.id, { name: 'Second' });

    const res = await as(adminToken).get(`${base()}/tours`);
    const serialized = JSON.stringify(res.body);
    for (const leak of ['agencyId', '"id"', 'or "id"', '  "id":']) {
      expect(serialized).not.toContain(leak);
    }
    expect(serialized).not.toContain('"passwordHash"');
  });

  // ------------------------------------------------------------------ details

  it('reads a tour by code, including archived ones', async () => {
    seedAdminOwner();
    const live = addTour(SAHARA.id);
    const archived = addTour(SAHARA.id, { status: 'ARCHIVED' });

    const res = await as(adminToken).get(`${base()}/tours/${archived.code}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(archived.code);
    expect(res.body.status).toBe('ARCHIVED');

    const liveRes = await as(adminToken).get(`${base()}/tours/${live.code}`);
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.itinerary).toHaveLength(0);
  });

  it('404 for a foreign tour and for an unknown code', async () => {
    seedAdminOwner();
    const foreign = addTour(ATLAS.id, { name: 'Other Tour' });

    const foreignRes = await as(adminToken).get(`${base()}/tours/${foreign.code}`);
    expect(foreignRes.status).toBe(404);
    expect(foreignRes.body.errorCode).toBe('TOUR_NOT_FOUND');

    const unknown = await as(adminToken).get(`${base()}/tours/TUR-000000000000`);
    expect(unknown.status).toBe(404);
  });

  // ------------------------------------------------------------- startingPrice

  it('startingPrice is the min price over OPEN departures, in list and details', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, { name: 'Priced Tour' });
    addDeparture(tour.id, { status: 'OPEN' });
    addDeparture(tour.id, { status: 'OPEN' });
    addDeparturePrice(tour.id, 'OPEN', 12000);
    addDeparturePrice(tour.id, 'OPEN', 9000);
    // Closed pricing (or anything on a closed departure) never counts.
    addDeparturePrice(tour.id, 'CLOSED', 1);

    const list = await as(adminToken).get(`${base()}/tours`);
    expect(list.status).toBe(200);
    const listed = list.body.find((t: { code: string }) => t.code === tour.code);
    expect(listed.startingPrice).toBe(9000);

    const detail = await as(adminToken).get(`${base()}/tours/${tour.code}`);
    expect(detail.status).toBe(200);
    expect(detail.body.startingPrice).toBe(9000);
  });

  it('startingPrice is null when no OPEN departure carries a price', async () => {
    seedAdminOwner();
    addTour(SAHARA.id, { name: 'No departures' });
    const closed = addTour(SAHARA.id, { name: 'All closed' });
    addDeparture(closed.id, { status: 'CLOSED' });
    addDeparture(closed.id, { status: 'CANCELLED' });
    addDeparturePrice(closed.id, 'CLOSED', 500);
    addDeparturePrice(closed.id, 'CANCELLED', 200);

    const res = await as(adminToken).get(`${base()}/tours`);
    expect(res.status).toBe(200);
    for (const tour of res.body) expect(tour.startingPrice).toBeNull();

    const detail = await as(adminToken).get(`${base()}/tours/${closed.code}`);
    expect(detail.body.startingPrice).toBeNull();
  });

  // -------------------------------------------------------------------- update

  it('replaces the full aggregate on PUT (children re-created, status untouched)', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken)
      .put(`${base()}/tours/${tour.code}`)
      .send({ ...readyPayload(), name: 'Renamed Tour', internalRef: 'REN-2' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Renamed Tour',
      internalRef: 'REN-2',
      status: 'DRAFT',
      highlights: [{ text: 'Summit views' }],
    });

    const stored = DB.tours[0]!;
    expect(stored.destinations).toEqual([{ wilayaCode: '16', locality: 'Béjaïa', place: 'Tikjda' }]);
    expect(stored.itinerary.map((d) => d.title)).toEqual(['Departure', 'Ascent']);
    expect(DB.auditLog.some((e) => e.action === 'AGENCY_TOUR_UPDATED')).toBe(true);
  });

  it('clears fields with null on replacement and rejects invalid payloads unchanged', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const cleared = await as(adminToken)
      .put(`${base()}/tours/${tour.code}`)
      .send({ ...readyPayload(), internalRef: null, destinations: [{ wilayaCode: '16', place: null }] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.internalRef).toBeNull();
    expect(cleared.body.destinations).toEqual([{ wilayaCode: '16', cityId: null, place: null }]);

    const before = JSON.stringify(DB.tours[0]!.destinations);
    const bad = await as(adminToken)
      .put(`${base()}/tours/${tour.code}`)
      .send({ ...readyPayload(), destinations: [] });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(DB.tours[0]!.destinations)).toBe(before);
  });

  it('404 when replacing a tour of another agency', async () => {
    seedAdminOwner();
    const foreign = addTour(ATLAS.id, { name: 'Other Tour' });

    const res = await as(adminToken)
      .put(`${base()}/tours/${foreign.code}`)
      .send(readyPayload());

    expect(res.status).toBe(404);
    expect(DB.tours[0]!.name).toBe('Other Tour');
  });

  // ------------------------------------------------------------------ publish

  it('publishes a ready on_request draft and records the audit event', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, {
      shortDescription: 'Ready summary',
      coverImageUrl: 'https://cdn.example.com/c.jpg',
    });

    const res = await as(adminToken).post(`${base()}/tours/${tour.code}/publish`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_TOUR_PUBLISHED');
    expect(audit?.targetCode).toBe(tour.code);
  });

  it('blocks publish with gaps and keeps the tour DRAFT', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, { name: '   ' });

    const res = await as(adminToken).post(`${base()}/tours/${tour.code}/publish`);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('TOUR_PUBLISH_READINESS_BLOCKED');
    expect(res.body.metadata.blockers).toContain('NAME');
    expect(DB.tours[0]!.status).toBe('DRAFT');
  });

  it('blocks a scheduled tour that has no OPEN departure', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, {
      availabilityMode: 'scheduled',
      shortDescription: 'Ready summary',
      coverImageUrl: 'https://cdn.example.com/c.jpg',
    });

    const res = await as(adminToken).post(`${base()}/tours/${tour.code}/publish`);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('TOUR_PUBLISH_READINESS_BLOCKED');
    expect(res.body.metadata.blockers).toEqual(['SCHEDULED_DEPARTURES_REQUIRED']);
  });

  it('publishes a scheduled tour once an OPEN departure exists', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, {
      availabilityMode: 'scheduled',
      shortDescription: 'Ready summary',
      coverImageUrl: 'https://cdn.example.com/c.jpg',
    });
    addDeparture(tour.id, { status: 'OPEN' });

    const res = await as(adminToken).post(`${base()}/tours/${tour.code}/publish`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('does not count CLOSED or CANCELLED departures toward publish readiness', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, {
      availabilityMode: 'scheduled',
      shortDescription: 'Ready summary',
      coverImageUrl: 'https://cdn.example.com/c.jpg',
    });
    addDeparture(tour.id, { status: 'CLOSED' });
    addDeparture(tour.id, { status: 'CANCELLED' });

    const res = await as(adminToken).post(`${base()}/tours/${tour.code}/publish`);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('TOUR_PUBLISH_READINESS_BLOCKED');
    expect(res.body.metadata.blockers).toEqual(['SCHEDULED_DEPARTURES_REQUIRED']);
  });

  it('is idempotent for an already-published tour and rejects an archived one', async () => {
    seedAdminOwner();
    const published = addTour(SAHARA.id, { status: 'PUBLISHED' });
    const archived = addTour(SAHARA.id, { status: 'ARCHIVED' });

    const again = await as(adminToken).post(`${base()}/tours/${published.code}/publish`);
    expect(again.status).toBe(200);
    expect(again.body.status).toBe('PUBLISHED');

    const archivedRes = await as(adminToken).post(`${base()}/tours/${archived.code}/publish`);
    expect(archivedRes.status).toBe(409);
    expect(archivedRes.body.errorCode).toBe('TOUR_PUBLISH_STATE_BLOCKED');
  });

  // ---------------------------------------------------------------- unpublish

  it('unpublishes a published tour to DRAFT and records the audit event', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, { status: 'PUBLISHED' });

    const res = await as(adminToken).post(`${base()}/tours/${tour.code}/unpublish`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_TOUR_UNPUBLISHED');
    expect(audit?.targetCode).toBe(tour.code);

    const noop = await as(adminToken).post(`${base()}/tours/${tour.code}/unpublish`);
    expect(noop.status).toBe(200);
    expect(noop.body.status).toBe('DRAFT');
  });

  it('rejects unpublish on an archived tour', async () => {
    seedAdminOwner();
    const archived = addTour(SAHARA.id, { status: 'ARCHIVED' });

    const res = await as(adminToken).post(`${base()}/tours/${archived.code}/unpublish`);
    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('TOUR_PUBLISH_STATE_BLOCKED');
  });

  // ------------------------------------------------------------------ archive

  it('archives a tour, records the audit event and hides it from the list', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id);

    const res = await as(adminToken).patch(`${base()}/tours/${tour.code}/archive`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');
    const audit = DB.auditLog.find((e) => e.action === 'AGENCY_TOUR_ARCHIVED');
    expect(audit?.targetCode).toBe(tour.code);

    const list = await as(adminToken).get(`${base()}/tours`);
    expect(list.body).toHaveLength(0);
  });

  it('409 when archiving an already-archived tour', async () => {
    seedAdminOwner();
    const tour = addTour(SAHARA.id, { status: 'ARCHIVED' });

    const res = await as(adminToken).patch(`${base()}/tours/${tour.code}/archive`);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('TOUR_ALREADY_ARCHIVED');
  });

  // --------------------------------------------------------- tenant isolation

  it('cannot act on an agency the caller is not a member of', async () => {
    seedAdminOwner();

    const res = await as(adminToken).get(`${base(ATLAS.code)}/tours`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });
});