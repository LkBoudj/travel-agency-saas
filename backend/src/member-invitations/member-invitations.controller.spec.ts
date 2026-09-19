import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SecurityModule } from '../security/security.module.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { MemberInvitationsModule } from './member-invitations.module.js';
import { MemberInvitationDeliveryService } from './member-invitation-delivery.js';
import { hashMemberInvitationToken } from './member-invitation-token.js';
import { MemberInvitationsService } from './member-invitations.service.js';
import { hashSensitive } from '../security/audit.service.js';
import { Prisma } from '../generated/prisma/client.js';

vi.mock('argon2', () => ({
  hash: vi.fn(async () => '$argon2id$test-hash'),
}));

/**
 * Member invitations over HTTP, through the real guards (JWT, agency
 * authorization, rate limiting) and the real domain service.
 *
 * The in-memory Prisma double models agency status, membership, role
 * scope/ownership, account status and the new invitation tables. The
 * cross-tenant triggers for invitation roles are verified directly against
 * PostgreSQL (see the `agency_member_invitation` migration).
 *
 * Delivery is overridden with a capture spy standing in for real email: tests
 * obtain plaintext tokens the way a real recipient would — from the delivery
 * channel, never from any API response.
 */

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

type InvitationRow = {
  id: bigint;
  code: string;
  agencyId: bigint;
  email: string;
  status: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdByUserId: bigint;
  createdAt: Date;
  roleIds: bigint[];
};

const NOW = new Date('2026-09-19T09:00:00.000Z');

const SAHARA = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

const admin = { id: 1n, code: 'USR-ADMIN0000001', email: 'admin@mail.com' };
const employee = { id: 2n, code: 'USR-EMPLOYEE0001', email: 'employee@mail.com' };
const outsider = { id: 3n, code: 'USR-OUTSIDER0001', email: 'outsider@mail.com' };
const atlasOwner = { id: 5n, code: 'USR-ATLASOWNER01', email: 'atlas@mail.com' };

const DB = {
  roles: new Map<bigint, RoleRow>(),
  users: new Map<bigint, UserRow>(),
  memberships: [] as MembershipRow[],
  agencies: new Map<bigint, typeof SAHARA>(),
  invitations: [] as InvitationRow[],
  auditEvents: [] as Array<Record<string, unknown>>,
};

/** Addresses whose pre-existing account "wins" the email race on acceptance. */
const raceEmails = new Set<string>();

/** Emails whose PENDING row the client loses to a concurrent create (P2002). */
const racePendingEmails = new Set<string>();
const raceCommitted = new Set<string>();

let nextId = 100n;
function id(): bigint {
  const value = nextId;
  nextId += 1n;
  return value;
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

/** Deterministic token for directly-seeded invitation rows. */
function seededToken(seed: string): string {
  return seed.repeat(8).slice(0, 43);
}

function seedInvitation(overrides: Partial<InvitationRow> & { email: string; agencyId: bigint }): InvitationRow {
  const row: InvitationRow = {
    id: id(),
    code: `INV-${rowOutline(nextId)}`,
    agencyId: overrides.agencyId,
    email: overrides.email,
    status: 'PENDING',
    tokenHash: hashMemberInvitationToken(seededToken(overrides.email)),
    expiresAt: new Date(NOW.getTime() + 72 * 3600_000),
    acceptedAt: null,
    revokedAt: null,
    createdByUserId: admin.id,
    createdAt: NOW,
    roleIds: [],
    ...overrides,
  };
  DB.invitations.push(row);
  return row;
}

function rowOutline(n: bigint): string {
  return String(n).padStart(12, '0').slice(0, 12);
}

function projectInvitation(row: InvitationRow) {
  const agency = DB.agencies.get(row.agencyId)!;
  return {
    id: row.id,
    code: row.code,
    email: row.email,
    status: row.status,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    agency: { id: agency.id, code: agency.code, name: agency.name, status: agency.status },
    roles: row.roleIds.map((roleId) => {
      const role = DB.roles.get(roleId)!;
      return {
        role: { id: role.id, key: role.key, name: role.name, scope: role.scope, agencyId: role.agencyId },
      };
    }),
  };
}

function p2002(metaTarget: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: metaTarget },
  });
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
    create: vi.fn(async ({ data }: { data: UserRow }) => {
      if (raceEmails.has(data.email)) throw p2002('app_user_email_key');
      if ([...DB.users.values()].some((u) => u.email === data.email)) throw p2002('app_user_email_key');
      const row: UserRow = {
        id: id(),
        code: data.code,
        email: data.email,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        status: 'ACTIVE',
        passwordHash: data.passwordHash,
      };
      DB.users.set(row.id, row);
      return { id: row.id, code: row.code };
    }),
  },
  role: {
    findMany: vi.fn(async ({ where }: { where: { key?: { in: string[] } } }) => {
      let rows = [...DB.roles.values()];
      if (where.key?.in) rows = rows.filter((r) => where.key!.in.includes(r.key));
      return rows.map((r) => ({ id: r.id, key: r.key, name: r.name, scope: r.scope, agencyId: r.agencyId }));
    }),
  },
  agency: {
    findUnique: vi.fn(
      async (args: { where: { code: string }; select: { members: { where: { appUserId: bigint } } } }) => {
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
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; appUser?: { is?: { email?: string } } } }) => {
        const email = where.appUser?.is?.email;
        const m = DB.memberships.find(
          (row) =>
            row.agencyId === where.agencyId &&
            (email === undefined || DB.users.get(row.appUserId)!.email === email),
        );
        return m ? { id: m.id } : null;
      },
    ),
    create: vi.fn(
      async ({ data }: { data: { agencyId: bigint; appUserId: bigint; membershipType: string; status: string } }) => {
        if (DB.memberships.some((m) => m.agencyId === data.agencyId && m.appUserId === data.appUserId)) {
          throw p2002('agency_membership_agency_id_app_user_id_key');
        }
        const row: MembershipRow = {
          id: id(),
          agencyId: data.agencyId,
          appUserId: data.appUserId,
          membershipType: data.membershipType,
          status: data.status,
          createdAt: NOW,
          roleIds: [],
        };
        DB.memberships.push(row);
        return { id: row.id, createdAt: row.createdAt };
      },
    ),
  },
  agencyRoleAssignment: {
    createMany: vi.fn(async ({ data }: { data: Array<{ membershipId: bigint; roleId: bigint }> }) => {
      let count = 0;
      for (const row of data) {
        const m = DB.memberships.find((r) => r.id === row.membershipId);
        if (m && !m.roleIds.includes(row.roleId)) {
          m.roleIds.push(row.roleId);
          count += 1;
        }
      }
      return { count };
    }),
  },
  agencyMemberInvitation: {
    findFirst: vi.fn(
      async ({ where }: { where: { agencyId: bigint; email: string; status: string } }) => {
        // A concurrent PENDING row "appears" mid-request: invisible to the
        // idempotency probe, then present when the P2002 is re-read.
        if (racePendingEmails.has(where.email) && !raceCommitted.has(where.email)) return null;
        const row = DB.invitations.find(
          (i) => i.agencyId === where.agencyId && i.email === where.email && i.status === where.status,
        );
        return row ? projectInvitation(row) : null;
      },
    ),
    findMany: vi.fn(
      async ({ where, orderBy }: { where: { agencyId: bigint; status?: string }; orderBy: unknown }) => {
        void orderBy;
        return DB.invitations
          .filter((i) => i.agencyId === where.agencyId)
          .filter((i) => !where.status || i.status === where.status)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(projectInvitation);
      },
    ),
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint; tokenHash?: string } }) => {
      const row = DB.invitations.find(
        (i) =>
          (where.id !== undefined && i.id === where.id) ||
          (where.tokenHash !== undefined && i.tokenHash === where.tokenHash),
      );
      return row ? projectInvitation(row) : null;
    }),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          code: string;
          agencyId: bigint;
          email: string;
          tokenHash: string;
          expiresAt: Date;
          createdByUserId: bigint;
          roles?: { create: Array<{ roleId: bigint }> };
        };
      }) => {
        if (racePendingEmails.has(data.email) && !raceCommitted.has(data.email)) {
          raceCommitted.add(data.email);
          throw p2002('agency_member_invitation_pending_agency_email_key');
        }
        if (DB.invitations.some((i) => i.agencyId === data.agencyId && i.email === data.email && i.status === 'PENDING')) {
          throw p2002('agency_member_invitation_pending_agency_email_key');
        }
        const row: InvitationRow = {
          id: id(),
          code: data.code,
          agencyId: data.agencyId,
          email: data.email,
          status: 'PENDING',
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          acceptedAt: null,
          revokedAt: null,
          createdByUserId: data.createdByUserId,
          createdAt: NOW,
          roleIds: (data.roles?.create ?? []).map((r) => r.roleId),
        };
        DB.invitations.push(row);
        return projectInvitation(row);
      },
    ),
    update: vi.fn(async ({ where, data }: { where: { id: bigint }; data: Partial<InvitationRow> }) => {
      const row = DB.invitations.find((i) => i.id === where.id)!;
      Object.assign(row, data);
      return projectInvitation(row);
    }),
    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: {
          agencyId?: bigint;
          status?: string;
          tokenHash?: string;
          code?: string;
          expiresAt?: { lte?: Date; gt?: Date };
        };
        data: Partial<InvitationRow>;
      }) => {
        let count = 0;
        for (const row of DB.invitations) {
          if (where.agencyId !== undefined && row.agencyId !== where.agencyId) continue;
          if (where.status !== undefined && row.status !== where.status) continue;
          if (where.tokenHash !== undefined && row.tokenHash !== where.tokenHash) continue;
          if (where.code !== undefined && row.code !== where.code) continue;
          if (where.expiresAt?.lte !== undefined && row.expiresAt.getTime() > where.expiresAt.lte.getTime()) continue;
          if (where.expiresAt?.gt !== undefined && row.expiresAt.getTime() <= where.expiresAt.gt.getTime()) continue;
          Object.assign(row, data);
          count += 1;
        }
        return { count };
      },
    ),
  },
  auditLog: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      DB.auditEvents.push(data);
      return { id: id() };
    }),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg !== 'function') return arg;
    const snapshot = {
      users: new Map(DB.users),
      memberships: DB.memberships.map((m) => ({ ...m, roleIds: [...m.roleIds] })),
      invitations: DB.invitations.map((i) => ({ ...i, roleIds: [...i.roleIds] })),
    };
    try {
      return await (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    } catch (error) {
      DB.users = snapshot.users;
      DB.memberships = snapshot.memberships;
      DB.invitations = snapshot.invitations;
      throw error;
    }
  }),
};

function baseline(): void {
  DB.roles.clear();
  DB.users.clear();
  DB.memberships = [];
  DB.agencies.clear();
  DB.invitations = [];
  DB.auditEvents = [];
  raceEmails.clear();
  racePendingEmails.clear();
  raceCommitted.clear();
  nextId = 100n;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  for (const seed of [admin, employee, outsider, atlasOwner]) addUser(seed);
}

/** Delivery capture spy: this is where plaintext tokens legitimately end up. */
type DeliveredPayload = {
  inviteeEmail: string;
  agencyName: string;
  agencyCode: string;
  token: string;
  expiresAt: Date;
};

const delivered: DeliveredPayload[] = [];
const deliverySpy = {
  deliver: vi.fn(async (payload: DeliveredPayload): Promise<void> => {
    delivered.push(payload);
  }),
};

/** The plaintext token for the most recent delivery to an address. */
function tokenFor(email: string): string {
  const match = [...delivered].reverse().find((d) => d.inviteeEmail === email);
  if (!match) throw new Error(`No delivery recorded for ${email}`);
  return match.token;
}

describe('Member invitations API', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let outsiderToken: string;
  let atlasOwnerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        AuthorizationModule,
        SecurityModule,
        MemberInvitationsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(MemberInvitationDeliveryService)
      .useValue(deliverySpy)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // Rate limits are opt-in in tests: they are enabled (and restored) by the
    // dedicated rate-limiting suite.
    const config = app.get(ConfigService);
    config.set('RATE_LIMIT_MEMBER_INVITE_CREATE_LIMIT', 0);
    config.set('RATE_LIMIT_MEMBER_INVITE_INSPECT_LIMIT', 0);
    config.set('RATE_LIMIT_MEMBER_INVITE_ACCEPT_LIMIT', 0);

    const jwt = app.get(JwtService);
    adminToken = jwt.sign({ sub: admin.id.toString() });
    employeeToken = jwt.sign({ sub: employee.id.toString() });
    outsiderToken = jwt.sign({ sub: outsider.id.toString() });
    atlasOwnerToken = jwt.sign({ sub: atlasOwner.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    delivered.length = 0;
    deliverySpy.deliver.mockClear();
    vi.clearAllMocks();
    app.get(RateLimitService).clear();
  });

  const cookie = (v: string) => `travel_access_token=${v}`;
  const as = (token: string) => ({
    get: (p: string) => request(app.getHttpServer()).get(p).set('Cookie', cookie(token)),
    post: (p: string) => request(app.getHttpServer()).post(p).set('Cookie', cookie(token)),
    delete: (p: string) => request(app.getHttpServer()).delete(p).set('Cookie', cookie(token)),
  });

  const base = (code = SAHARA.code) => `/v1/agencies/${code}/member-invitations`;

  const INVITE_PERMISSIONS = ['AGENCY_MEMBER_VIEW', 'AGENCY_MEMBER_INVITE'];

  /** Makes the caller an OWNER holding the invitation permissions. */
  function seedAdminOwner(agencyId = SAHARA.id): RoleRow {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, INVITE_PERMISSIONS, 'Agency Owner');
    addMembership(agencyId, admin.id, [role.id], { membershipType: 'OWNER' });
    return role;
  }

  describe('guards and tenant isolation', () => {
    it('requires a session on every agency route', async () => {
      await request(app.getHttpServer()).post(base()).send({ email: 'a@b.com' }).expect(401);
      await request(app.getHttpServer()).get(base()).expect(401);
      await request(app.getHttpServer()).delete(`${base()}/INV-000000000000`).expect(401);
    });

    it('denies create/revoke without AGENCY_MEMBER_INVITE', async () => {
      const role = addRole('AGENCY_VIEWER', 'AGENCY', null, ['AGENCY_MEMBER_VIEW']);
      addMembership(SAHARA.id, admin.id, [role.id]);
      await as(adminToken).post(base()).send({ email: 'a@b.com' }).expect(403);
      const created = await as(adminToken)
        .post(base())
        .send({ email: 'viewer@mail.com', roleKeys: ['AGENCY_BOOKING_AGENT'] })
        .expect(403);
      expect(created.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
    });

    it('denies list without AGENCY_MEMBER_VIEW', async () => {
      const role = addRole('AGENCY_INVITER', 'AGENCY', null, ['AGENCY_MEMBER_INVITE']);
      addMembership(SAHARA.id, admin.id, [role.id]);
      seedInvitation({ email: 'a@b.com', agencyId: SAHARA.id });
      const res = await as(adminToken).get(base()).expect(403);
      expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
    });

    it('rejects a suspended agency with AGENCY_SUSPENDED', async () => {
      seedAdminOwner();
      DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';
      const res = await as(adminToken).post(base()).send({ email: 'a@b.com' }).expect(403);
      expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
    });

    it('reports an unknown agency as 404', async () => {
      const res = await as(adminToken).get(base('AGY-UNKNOWN000001')).expect(404);
      expect(res.body.errorCode).toBe('AGENCY_NOT_FOUND');
    });

    it('is perfectly scoped: operating on one agency never leaks into another', async () => {
      const atlasRole = addRole('AGENCY_OWNER', 'AGENCY', null, INVITE_PERMISSIONS, 'Agency Owner');
      addMembership(ATLAS.id, atlasOwner.id, [atlasRole.id]);
      seedAdminOwner();

      const invited = await as(atlasOwnerToken)
        .post(base(ATLAS.code))
        .send({ email: 'atlas-invitee@example.com' })
        .expect(201);
      expect(invited.body.status).toBe('PENDING');

      // The invite lives under ATLAS only: SAHARA's list is empty.
      const saharaList = await as(adminToken).get(base()).expect(200);
      expect(saharaList.body).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('creates a PENDING invitation with a uniform shape and delivers the token out-of-band', async () => {
      seedAdminOwner();
      addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
      addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, [], 'Tour Manager');

      const res = await as(adminToken)
        .post(base())
        .send({ email: 'mr.new@example.com', roleKeys: ['AGENCY_TOUR_MANAGER', 'AGENCY_BOOKING_AGENT'] })
        .expect(201);

      expect(res.body.code).toMatch(/^INV-[0-9A-F]{12}$/);
      expect(res.body.email).toBe('mr.new@example.com');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.roles).toEqual([
        { key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent' },
        { key: 'AGENCY_TOUR_MANAGER', name: 'Tour Manager' },
      ]);
      // The redemption material never appears in any response.
      expect(res.body.token).toBeUndefined();
      expect(res.body.tokenHash).toBeUndefined();
      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('agency');

      // ...but it reached the delivery channel — the only legitimate place.
      expect(delivered).toHaveLength(1);
      const sent = delivered[0];
      expect(sent.inviteeEmail).toBe('mr.new@example.com');
      expect(sent.agencyCode).toBe(SAHARA.code);
      expect(sent.token).toHaveLength(43);
      const row = DB.invitations.find((i) => i.email === 'mr.new@example.com')!;
      expect(row.tokenHash).toBe(hashMemberInvitationToken(sent.token));
      expect(row.status).toBe('PENDING');
    });

    it('answers identically for an existing platform address — no existence hint', async () => {
      seedAdminOwner();
      const existing = await as(adminToken)
        .post(base())
        .send({ email: 'outsider@mail.com', roleKeys: [] })
        .expect(201);
      const unknown = await as(adminToken)
        .post(base())
        .send({ email: 'brand-new@example.com', roleKeys: [] })
        .expect(201);
      expect(Object.keys(existing.body).sort()).toEqual(Object.keys(unknown.body).sort());
      expect(existing.body.status).toBe('PENDING');
    });

    it('is idempotent: the outstanding pending invitation is returned, no second delivery', async () => {
      seedAdminOwner();
      addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
      addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, [], 'Tour Manager');

      const first = await as(adminToken)
        .post(base())
        .send({ email: 'stable@example.com', roleKeys: ['AGENCY_BOOKING_AGENT'] })
        .expect(201);
      const second = await as(adminToken)
        .post(base())
        .send({ email: 'stable@example.com', roleKeys: ['AGENCY_TOUR_MANAGER'] })
        .expect(201);

      expect(second.body.code).toBe(first.body.code);
      expect(second.body.status).toBe('PENDING');
      expect(second.body.roles).toEqual([{ key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent' }]);
      expect(delivered).toHaveLength(1);
    });

    it('rejects an address that is already a member (409 ALREADY_AGENCY_MEMBER)', async () => {
      seedAdminOwner();
      addMembership(SAHARA.id, employee.id, []);
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'employee@mail.com', roleKeys: [] })
        .expect(409);
      expect(res.body.errorCode).toBe('ALREADY_AGENCY_MEMBER');
      expect(delivered).toHaveLength(0);
    });

    it('rejects unknown role keys (400 UNKNOWN_AGENCY_ROLE_KEYS)', async () => {
      seedAdminOwner();
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'x@example.com', roleKeys: ['NO_SUCH_ROLE_KEY'] })
        .expect(400);
      expect(res.body.errorCode).toBe('UNKNOWN_AGENCY_ROLE_KEYS');
      expect(res.body.unknownKeys).toEqual(['NO_SUCH_ROLE_KEY']);
      expect(delivered).toHaveLength(0);
      expect(DB.invitations).toHaveLength(0);
    });

    it('rejects PLATFORM-scoped roles (400 ROLE_NOT_ASSIGNABLE_IN_AGENCY)', async () => {
      seedAdminOwner();
      addRole('PLATFORM_ADMIN', 'PLATFORM', null, []);
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'x@example.com', roleKeys: ['PLATFORM_ADMIN'] })
        .expect(400);
      expect(res.body.errorCode).toBe('ROLE_NOT_ASSIGNABLE_IN_AGENCY');
      expect(res.body.roleKeys).toEqual(['PLATFORM_ADMIN']);
    });

    it('rejects a custom role owned by ANOTHER agency', async () => {
      seedAdminOwner();
      addRole('ATLAS_CUSTOM', 'AGENCY', ATLAS.id, []);
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'x@example.com', roleKeys: ['ATLAS_CUSTOM'] })
        .expect(400);
      expect(res.body.errorCode).toBe('ROLE_NOT_ASSIGNABLE_IN_AGENCY');
    });

    it('accepts a custom role owned by THIS agency', async () => {
      seedAdminOwner();
      addRole('SAHARA_NIGHT_DESK', 'AGENCY', SAHARA.id, [], 'Night Desk');
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'night@example.com', roleKeys: ['SAHARA_NIGHT_DESK'] })
        .expect(201);
      expect(res.body.roles).toEqual([{ key: 'SAHARA_NIGHT_DESK', name: 'Night Desk' }]);
    });

    it('normalizes the email (trim + lowercase) before storing or delivering', async () => {
      seedAdminOwner();
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'MIXED-Case@Example.COM', roleKeys: [] })
        .expect(201);
      expect(res.body.email).toBe('mixed-case@example.com');
      expect(delivered[0].inviteeEmail).toBe('mixed-case@example.com');
      expect(DB.invitations.find((i) => i.code === res.body.code)!.email).toBe('mixed-case@example.com');
    });

    it('accepts an invitation with zero roles', async () => {
      seedAdminOwner();
      const res = await as(adminToken).post(base()).send({ email: 'bare@example.com' }).expect(201);
      expect(res.body.roles).toEqual([]);
    });

    it('deduplicates repeated role keys in one request', async () => {
      seedAdminOwner();
      addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
      addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, [], 'Tour Manager');
      const res = await as(adminToken)
        .post(base())
        .send({ email: 'dedupe@example.com', roleKeys: ['AGENCY_BOOKING_AGENT', 'AGENCY_BOOKING_AGENT', 'AGENCY_TOUR_MANAGER'] })
        .expect(201);
      expect(res.body.roles).toHaveLength(2);
      const row = DB.invitations.find((i) => i.code === res.body.code)!;
      expect(row.roleIds).toHaveLength(2);
    });

    it('handles the P2002 race: a concurrent pending invitation wins, and it is returned as-is', async () => {
      seedAdminOwner();
      const raced = seedInvitation({ email: 'race-pending@example.com', agencyId: SAHARA.id });
      racePendingEmails.add('race-pending@example.com');

      const res = await as(adminToken)
        .post(base())
        .send({ email: 'race-pending@example.com', roleKeys: [] })
        .expect(201);
      expect(res.body.code).toBe(raced.code);
      expect(res.body.status).toBe('PENDING');
      // Won by the contender: no second row and no second delivery.
      expect(DB.invitations.filter((i) => i.email === 'race-pending@example.com')).toHaveLength(1);
      expect(delivered).toHaveLength(0);
    });
  });

  describe('list / revoke', () => {
    it('shows only THIS agency invitations', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'ours@example.com', agencyId: SAHARA.id });
      seedInvitation({ email: 'theirs@example.com', agencyId: ATLAS.id });
      const res = await as(adminToken).get(base()).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe('ours@example.com');
    });

    it('lists newest first, eagerly expires overdue rows and filters by status', async () => {
      seedAdminOwner();
      seedInvitation({
        email: 'older@example.com',
        agencyId: SAHARA.id,
        createdAt: new Date(NOW.getTime() - 3600_000),
      });
      seedInvitation({ email: 'newer@example.com', agencyId: SAHARA.id, createdAt: NOW });
      seedInvitation({
        email: 'overdue@example.com',
        agencyId: SAHARA.id,
        createdAt: new Date(NOW.getTime() - 2 * 3600_000),
        expiresAt: new Date(NOW.getTime() - 1000),
      });

      const res = await as(adminToken).get(base()).expect(200);
      expect(res.body.map((i: { code: string }) => i.code)).toEqual([
        DB.invitations.find((i) => i.email === 'newer@example.com')!.code,
        DB.invitations.find((i) => i.email === 'older@example.com')!.code,
        DB.invitations.find((i) => i.email === 'overdue@example.com')!.code,
      ]);
      expect(res.body.map((i: { status: string }) => i.status)).toEqual([
        'PENDING',
        'PENDING',
        'EXPIRED',
      ]);
      // The expired row was persisted, not just rendered.
      expect(DB.invitations.find((i) => i.email === 'overdue@example.com')!.status).toBe('EXPIRED');

      // No token material, ever.
      for (const item of res.body as Array<Record<string, unknown>>) {
        expect(item.token).toBeUndefined();
        expect(item.tokenHash).toBeUndefined();
      }

      const filtered = await as(adminToken).get(`${base()}?status=EXPIRED`).expect(200);
      expect(filtered.body).toHaveLength(1);
      expect(filtered.body[0].email).toBe('overdue@example.com');
    });

    it('revokes a pending invitation once, then 404 — lifecycle is not probable', async () => {
      seedAdminOwner();
      const created = await as(adminToken)
        .post(base())
        .send({ email: 'leave@example.com', roleKeys: [] })
        .expect(201);

      await as(adminToken).delete(`${base()}/${created.body.code}`).expect(204);
      expect(DB.invitations.find((i) => i.code === created.body.code)!.status).toBe('REVOKED');

      const again = await as(adminToken).delete(`${base()}/${created.body.code}`).expect(404);
      expect(again.body.errorCode).toBe('INVITATION_NOT_FOUND');

      const list = await as(adminToken).get(base()).expect(200);
      expect(list.body[0].status).toBe('REVOKED');
    });

    it('treats an ACCEPTED invitation as not revocable (404)', async () => {
      seedAdminOwner();
      const row = seedInvitation({ email: 'done@example.com', agencyId: SAHARA.id, status: 'ACCEPTED' });
      const res = await as(adminToken).delete(`${base()}/${row.code}`).expect(404);
      expect(res.body.errorCode).toBe('INVITATION_NOT_FOUND');
    });

    it('cannot revoke another agency invitation through this route (404)', async () => {
      seedAdminOwner();
      const foreign = seedInvitation({ email: 'foreign@example.com', agencyId: ATLAS.id });
      const res = await as(adminToken).delete(`${base()}/${foreign.code}`).expect(404);
      expect(res.body.errorCode).toBe('INVITATION_NOT_FOUND');
      expect(DB.invitations.find((i) => i.code === foreign.code)!.status).toBe('PENDING');
    });

    it('allows re-inviting the same email after a revoke', async () => {
      seedAdminOwner();
      const first = await as(adminToken)
        .post(base())
        .send({ email: 'rejoin@example.com', roleKeys: [] })
        .expect(201);
      await as(adminToken).delete(`${base()}/${first.body.code}`).expect(204);

      const second = await as(adminToken)
        .post(base())
        .send({ email: 'rejoin@example.com', roleKeys: [] })
        .expect(201);
      expect(second.body.code).not.toBe(first.body.code);
      expect(DB.invitations.filter((i) => i.email === 'rejoin@example.com')).toHaveLength(2);
      expect(delivered).toHaveLength(2);
    });
  });

  describe('public inspect', () => {
    it('returns 404 for an unknown token', async () => {
      seedAdminOwner();
      const res = await request(app.getHttpServer()).get('/v1/member-invitations/not-a-real-token').expect(404);
      expect(res.body.errorCode).toBe('INVITATION_NOT_FOUND');
    });

    it('shows the live state for a pending token without exposing email or roles', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'owner@example.com', agencyId: SAHARA.id });
      const res = await request(app.getHttpServer())
        .get(`/v1/member-invitations/${seededToken('owner@example.com')}`)
        .expect(200);
      expect(res.body).toEqual({
        agency: { code: SAHARA.code, name: SAHARA.name },
        status: 'PENDING',
        expiresAt: expect.any(String),
      });
      expect(res.body.email).toBeUndefined();
      expect(res.body.roles).toBeUndefined();
    });

    it('persists and reports an overdue pending token as EXPIRED', async () => {
      seedAdminOwner();
      seedInvitation({
        email: 'late@example.com',
        agencyId: SAHARA.id,
        expiresAt: new Date(NOW.getTime() - 1000),
      });
      const res = await request(app.getHttpServer())
        .get(`/v1/member-invitations/${seededToken('late@example.com')}`)
        .expect(200);
      expect(res.body.status).toBe('EXPIRED');
      expect(DB.invitations.find((i) => i.email === 'late@example.com')!.status).toBe('EXPIRED');
    });

    it('reports revoked and accepted tokens as-is', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'revoked@example.com', agencyId: SAHARA.id, status: 'REVOKED' });
      seedInvitation({ email: 'already@example.com', agencyId: SAHARA.id, status: 'ACCEPTED' });

      const revoked = await request(app.getHttpServer())
        .get(`/v1/member-invitations/${seededToken('revoked@example.com')}`)
        .expect(200);
      const accepted = await request(app.getHttpServer())
        .get(`/v1/member-invitations/${seededToken('already@example.com')}`)
        .expect(200);
      expect(revoked.body.status).toBe('REVOKED');
      expect(accepted.body.status).toBe('ACCEPTED');
    });
  });

  describe('accept', () => {
    it('redeems once as a brand-new account: account, EMPLOYEE membership and offered roles', async () => {
      seedAdminOwner();
      addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
      addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, [], 'Tour Manager');

      const created = await as(adminToken)
        .post(base())
        .send({ email: 'newbie@example.com', roleKeys: ['AGENCY_BOOKING_AGENT', 'AGENCY_TOUR_MANAGER'] })
        .expect(201);
      const token = tokenFor('newbie@example.com');

      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${token}/accept`)
        .send({ password: 'S3cret-password', firstName: 'New', lastName: 'Hire' })
        .expect(200);

      expect(res.body).toEqual({
        status: 'ACCEPTED',
        agency: { code: SAHARA.code, name: SAHARA.name },
        membershipType: 'EMPLOYEE',
        membershipStatus: 'ACTIVE',
        roles: [
          { key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent' },
          { key: 'AGENCY_TOUR_MANAGER', name: 'Tour Manager' },
        ],
        joinedAt: expect.any(String),
      });

      // The account exists exactly once, generated, never taking the email from the request.
      const account = [...DB.users.values()].find((u) => u.email === 'newbie@example.com')!;
      expect(account).toBeDefined();
      expect(account.code).toMatch(/^USR-/);
      expect(account.status).toBe('ACTIVE');
      // The password is stored as the argon2 hash only — never the plaintext.
      expect(account.passwordHash).toBe('$argon2id$test-hash');
      expect(DB.memberships).toHaveLength(2);
      const membership = DB.memberships.find((m) => m.appUserId === account.id)!;
      expect(membership).toMatchObject({ agencyId: SAHARA.id, membershipType: 'EMPLOYEE', status: 'ACTIVE' });

      const invitation = DB.invitations.find((i) => i.code === created.body.code)!;
      expect(invitation.status).toBe('ACCEPTED');
      expect(invitation.acceptedAt).toBeInstanceOf(Date);

      // A token redeems exactly once.
      const again = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${token}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(409);
      expect(again.body.errorCode).toBe('INVITATION_ALREADY_ACCEPTED');
    });

    it('requires a password when no account exists (400 INVITATION_PASSWORD_REQUIRED)', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'nopw@example.com', agencyId: SAHARA.id });
      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('nopw@example.com')}/accept`)
        .send({ firstName: 'No' })
        .expect(400);
      expect(res.body.errorCode).toBe('INVITATION_PASSWORD_REQUIRED');
      expect([...DB.users.values()].some((u) => u.email === 'nopw@example.com')).toBe(false);
      expect(DB.invitations.find((i) => i.email === 'nopw@example.com')!.status).toBe('PENDING');
    });

    it('requires the matching session for an existing account (401 INVITATION_AUTH_REQUIRED)', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'outsider@mail.com', agencyId: SAHARA.id });
      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('outsider@mail.com')}/accept`)
        .send({})
        .expect(401);
      expect(res.body.errorCode).toBe('INVITATION_AUTH_REQUIRED');
    });

    it('refuses a DIFFERENT signed-in account (403 INVITATION_EMAIL_MISMATCH)', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'outsider@mail.com', agencyId: SAHARA.id });
      const res = await as(adminToken)
        .post(`/v1/member-invitations/${seededToken('outsider@mail.com')}/accept`)
        .send({})
        .expect(403);
      expect(res.body.errorCode).toBe('INVITATION_EMAIL_MISMATCH');
      // The invitation survives the failed redemption.
      expect(DB.invitations.find((i) => i.email === 'outsider@mail.com')!.status).toBe('PENDING');
    });

    it('grants membership when the signed-in account matches the invited email', async () => {
      seedAdminOwner();
      addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
      seedInvitation({ email: 'outsider@mail.com', agencyId: SAHARA.id, roleIds: [] });
      // Attach the offered role to the seeded row.
      DB.invitations.find((i) => i.email === 'outsider@mail.com')!.roleIds = [
        [...DB.roles.values()].find((r) => r.key === 'AGENCY_BOOKING_AGENT')!.id,
      ];

      const res = await as(outsiderToken)
        .post(`/v1/member-invitations/${seededToken('outsider@mail.com')}/accept`)
        .send({})
        .expect(200);
      expect(res.body.membershipStatus).toBe('ACTIVE');
      expect(res.body.roles).toEqual([{ key: 'AGENCY_BOOKING_AGENT', name: 'Booking Agent' }]);

      const membership = DB.memberships.find((m) => m.appUserId === outsider.id)!;
      expect(membership).toMatchObject({ agencyId: SAHARA.id, membershipType: 'EMPLOYEE', status: 'ACTIVE' });
      expect(DB.invitations.find((i) => i.email === 'outsider@mail.com')!.status).toBe('ACCEPTED');
    });

    it('refuses acceptance by a suspended account (INVITATION_ACCOUNT_SUSPENDED)', async () => {
      seedAdminOwner();
      const suspended = addUser({ id: 9n, code: 'USR-SUSPENDED001', email: 'suspended@mail.com' }, 'SUSPENDED');
      seedInvitation({ email: 'suspended@mail.com', agencyId: SAHARA.id });

      const service = app.get(MemberInvitationsService);
      const caller = {
        id: suspended.id.toString(),
        code: suspended.code,
        email: suspended.email,
        firstName: null,
        lastName: null,
        status: 'ACTIVE',
      };
      const error = await service
        .accept(seededToken('suspended@mail.com'), caller, {})
        .then(() => null, (e: unknown) => e);
      expect((error as { getResponse?: () => unknown }).getResponse?.()).toMatchObject({
        statusCode: 403,
        errorCode: 'INVITATION_ACCOUNT_SUSPENDED',
      });
    });

    it('refuses acceptance while the agency is suspended, before any account work', async () => {
      seedAdminOwner();
      DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';
      seedInvitation({ email: 'nobody@example.com', agencyId: SAHARA.id });

      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('nobody@example.com')}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(403);
      expect(res.body.errorCode).toBe('INVITATION_AGENCY_SUSPENDED');
      expect([...DB.users.values()].some((u) => u.email === 'nobody@example.com')).toBe(false);
      expect(DB.invitations.find((i) => i.email === 'nobody@example.com')!.status).toBe('PENDING');
    });

    it('rejects a revoked token with 409 INVITATION_REVOKED', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'gone@example.com', agencyId: SAHARA.id, status: 'REVOKED' });
      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('gone@example.com')}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(409);
      expect(res.body.errorCode).toBe('INVITATION_REVOKED');
    });

    it('rejects an expired token with 410 INVITATION_EXPIRED and persists the transition', async () => {
      seedAdminOwner();
      seedInvitation({
        email: 'expired@example.com',
        agencyId: SAHARA.id,
        expiresAt: new Date(NOW.getTime() - 1000),
      });
      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('expired@example.com')}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(410);
      expect(res.body.errorCode).toBe('INVITATION_EXPIRED');
      expect(DB.invitations.find((i) => i.email === 'expired@example.com')!.status).toBe('EXPIRED');
    });

    it('rejects an already-accepted token with 409 INVITATION_ALREADY_ACCEPTED', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'done@example.com', agencyId: SAHARA.id, status: 'ACCEPTED' });
      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('done@example.com')}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(409);
      expect(res.body.errorCode).toBe('INVITATION_ALREADY_ACCEPTED');
    });

    it('reports 409 ALREADY_AGENCY_MEMBER if the invitee joined meanwhile', async () => {
      seedAdminOwner();
      addMembership(SAHARA.id, employee.id, []);
      seedInvitation({ email: 'employee@mail.com', agencyId: SAHARA.id });

      const res = await as(employeeToken)
        .post(`/v1/member-invitations/${seededToken('employee@mail.com')}/accept`)
        .send({})
        .expect(409);
      expect(res.body.errorCode).toBe('ALREADY_AGENCY_MEMBER');
      // The failed redemption rolls back: the invitation is still live.
      expect(DB.invitations.find((i) => i.email === 'employee@mail.com')!.status).toBe('PENDING');
    });

    it('surfaces a same-moment email race as EMAIL_ALREADY_REGISTERED and rolls back', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'racy@example.com', agencyId: SAHARA.id });
      raceEmails.add('racy@example.com');

      const res = await request(app.getHttpServer())
        .post(`/v1/member-invitations/${seededToken('racy@example.com')}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(409);
      expect(res.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');
      expect([...DB.users.values()].some((u) => u.email === 'racy@example.com')).toBe(false);
      expect(DB.invitations.find((i) => i.email === 'racy@example.com')!.status).toBe('PENDING');
    });
  });

  describe('audit', () => {
    it('records create, revoke and accept events', async () => {
      seedAdminOwner();
      addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [], 'Booking Agent');
      await as(adminToken)
        .post(base())
        .send({ email: 'audited-accept@example.com', roleKeys: ['AGENCY_BOOKING_AGENT'] })
        .expect(201);
      const revoked = await as(adminToken)
        .post(base())
        .send({ email: 'audited-revoke@example.com', roleKeys: [] })
        .expect(201);

      const createdEvent = DB.auditEvents.find(
        (e) => e.action === 'AGENCY_MEMBER_INVITATION_CREATED',
      )!;
      expect(createdEvent).toMatchObject({
        outcome: 'SUCCESS',
        actorCode: admin.code,
        agencyCode: SAHARA.code,
      });
      expect(createdEvent).toHaveProperty('targetHash', hashSensitive('audited-accept@example.com'));
      expect(createdEvent).not.toHaveProperty('sensitiveTarget');
      expect(createdEvent.metadata).toEqual({ roleKeyCount: 1 });

      await as(adminToken).delete(`${base()}/${revoked.body.code}`).expect(204);
      expect(
        DB.auditEvents.find((e) => e.action === 'AGENCY_MEMBER_INVITATION_REVOKED'),
      ).toMatchObject({
        outcome: 'SUCCESS',
        metadata: { invitationCode: revoked.body.code },
      });

      const token = tokenFor('audited-accept@example.com');
      await request(app.getHttpServer())
        .post(`/v1/member-invitations/${token}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(200);
      expect(DB.auditEvents.find((e) => e.action === 'AGENCY_MEMBER_INVITATION_ACCEPTED')).toMatchObject({
        outcome: 'SUCCESS',
        actorCode: null,
        metadata: { joinType: 'new-account' },
      });
    });

    it('never records the plaintext token, tokenHash or password in any audit event', async () => {
      seedAdminOwner();
      await as(adminToken)
        .post(base())
        .send({ email: 'secret@example.com', roleKeys: [] })
        .expect(201);
      const token = tokenFor('secret@example.com');
      await request(app.getHttpServer())
        .post(`/v1/member-invitations/${token}/accept`)
        .send({ password: 'S3cret-password' })
        .expect(200);

      for (const event of DB.auditEvents) {
        const serialized = JSON.stringify(event);
        expect(serialized).not.toContain(token);
        expect(serialized).not.toContain(hashMemberInvitationToken(token));
        expect(serialized).not.toContain('S3cret-password');
        expect(event).not.toHaveProperty('token');
        expect(event).not.toHaveProperty('tokenHash');
        expect(event).not.toHaveProperty('password');
      }
    });
  });

  describe('rate limiting', () => {
    const config = () => app.get(ConfigService);

    it('throttles invitation creation per actor (429 RATE_LIMITED)', async () => {
      seedAdminOwner();
      config().set('RATE_LIMIT_MEMBER_INVITE_CREATE_LIMIT', 1);
      try {
        await as(adminToken).post(base()).send({ email: 'one@example.com', roleKeys: [] }).expect(201);
        const res = await as(adminToken)
          .post(base())
          .send({ email: 'two@example.com', roleKeys: [] })
          .expect(429);
        expect(res.body.errorCode).toBe('RATE_LIMITED');
      } finally {
        config().set('RATE_LIMIT_MEMBER_INVITE_CREATE_LIMIT', 0);
        app.get(RateLimitService).clear();
      }
    });

    it('throttles acceptance per IP', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'rate-a@example.com', agencyId: SAHARA.id });
      seedInvitation({ email: 'rate-b@example.com', agencyId: SAHARA.id });
      config().set('RATE_LIMIT_MEMBER_INVITE_ACCEPT_LIMIT', 1);
      try {
        await request(app.getHttpServer())
          .post(`/v1/member-invitations/${seededToken('rate-a@example.com')}/accept`)
          .send({ password: 'S3cret-password' })
          .expect(200);
        const res = await request(app.getHttpServer())
          .post(`/v1/member-invitations/${seededToken('rate-b@example.com')}/accept`)
          .send({ password: 'S3cret-password' })
          .expect(429);
        expect(res.body.errorCode).toBe('RATE_LIMITED');
      } finally {
        config().set('RATE_LIMIT_MEMBER_INVITE_ACCEPT_LIMIT', 0);
        app.get(RateLimitService).clear();
      }
    });

    it('throttles inspection per IP', async () => {
      seedAdminOwner();
      seedInvitation({ email: 'inspect-a@example.com', agencyId: SAHARA.id });
      seedInvitation({ email: 'inspect-b@example.com', agencyId: SAHARA.id });
      config().set('RATE_LIMIT_MEMBER_INVITE_INSPECT_LIMIT', 1);
      try {
        await request(app.getHttpServer())
          .get(`/v1/member-invitations/${seededToken('inspect-a@example.com')}`)
          .expect(200);
        const res = await request(app.getHttpServer())
          .get(`/v1/member-invitations/${seededToken('inspect-b@example.com')}`)
          .expect(429);
        expect(res.body.errorCode).toBe('RATE_LIMITED');
      } finally {
        config().set('RATE_LIMIT_MEMBER_INVITE_INSPECT_LIMIT', 0);
        app.get(RateLimitService).clear();
      }
    });
  });

  it('stores only the SHA-256 hash and rejects a wrong token', async () => {
    seedAdminOwner();
    seedInvitation({ email: 'hash@example.com', agencyId: SAHARA.id });
    const row = DB.invitations.find((i) => i.email === 'hash@example.com')!;
    expect(row.tokenHash).toBe(hashMemberInvitationToken(seededToken('hash@example.com')));

    const res = await request(app.getHttpServer())
      .get('/v1/member-invitations/some-other-token')
      .expect(404);
    expect(res.body.errorCode).toBe('INVITATION_NOT_FOUND');
  });
});