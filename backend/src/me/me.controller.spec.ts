import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { MeModule } from './me.module.js';

/**
 * `GET /v1/me/agencies` — the pre-selection endpoint the Agency Dashboard calls
 * to discover which agency contexts the caller may enter.
 *
 * The property that matters most here is isolation: the response must describe
 * the caller's own memberships and nothing else, because this route is
 * authenticated only and cannot lean on an agency permission.
 */

type AgencyRow = { id: bigint; code: string; name: string; status: string };

type MembershipRow = {
  agencyId: bigint;
  appUserId: bigint;
  membershipType: string;
  status: string;
};

const SAHARA: AgencyRow = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS: AgencyRow = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };
const CLOSED: AgencyRow = { id: 30n, code: 'AGY-CLOSED00001', name: 'Closed Travel', status: 'SUSPENDED' };

const owner = { id: 1n, code: 'USR-OWNER0000001', email: 'owner@mail.com', status: 'ACTIVE' };
const other = { id: 2n, code: 'USR-OTHER0000001', email: 'other@mail.com', status: 'ACTIVE' };

const DB = {
  agencies: new Map<bigint, AgencyRow>(),
  memberships: [] as MembershipRow[],
  users: new Map<bigint, typeof owner>(),
};

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint } }) =>
      where.id === undefined ? null : (DB.users.get(where.id) ?? null),
    ),
  },
  agencyMembership: {
    findMany: vi.fn(async ({ where }: { where: { appUserId: bigint } }) =>
      DB.memberships
        .filter((m) => m.appUserId === where.appUserId)
        .map((m) => ({
          membershipType: m.membershipType,
          status: m.status,
          agency: (({ code, name, status }) => ({ code, name, status }))(
            DB.agencies.get(m.agencyId)!,
          ),
        })),
    ),
  },
};

function baseline(): void {
  DB.agencies.clear();
  DB.memberships = [];
  DB.users.clear();
  for (const agency of [SAHARA, ATLAS, CLOSED]) DB.agencies.set(agency.id, { ...agency });
  for (const user of [owner, other]) DB.users.set(user.id, { ...user });
}

describe('GET /v1/me/agencies', () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, MeModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    ownerToken = app.get(JwtService).sign({ sub: owner.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const api = () =>
    request(app.getHttpServer())
      .get('/v1/me/agencies')
      .set('Cookie', `travel_access_token=${ownerToken}`);

  it('401 without an auth cookie', async () => {
    expect((await request(app.getHttpServer()).get('/v1/me/agencies')).status).toBe(401);
  });

  it('returns an empty list for someone with no memberships', async () => {
    const res = await api();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns every agency the caller belongs to', async () => {
    DB.memberships.push(
      { agencyId: SAHARA.id, appUserId: owner.id, membershipType: 'OWNER', status: 'ACTIVE' },
      { agencyId: ATLAS.id, appUserId: owner.id, membershipType: 'EMPLOYEE', status: 'ACTIVE' },
    );

    const res = await api();
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((a: { code: string }) => a.code).sort()).toEqual([
      ATLAS.code,
      SAHARA.code,
    ]);
  });

  it('scopes the query to the caller, so another user’s agency is absent', async () => {
    DB.memberships.push(
      { agencyId: SAHARA.id, appUserId: owner.id, membershipType: 'OWNER', status: 'ACTIVE' },
      { agencyId: ATLAS.id, appUserId: other.id, membershipType: 'OWNER', status: 'ACTIVE' },
    );

    const res = await api();
    expect(res.body).toHaveLength(1);
    expect(res.body[0].code).toBe(SAHARA.code);

    // The filter is the caller's own id, not something from the request.
    expect(prismaMock.agencyMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { appUserId: owner.id } }),
    );
  });

  it('includes a suspended agency and a suspended membership, so the UI can explain them', async () => {
    DB.memberships.push(
      { agencyId: CLOSED.id, appUserId: owner.id, membershipType: 'OWNER', status: 'ACTIVE' },
      { agencyId: ATLAS.id, appUserId: owner.id, membershipType: 'EMPLOYEE', status: 'SUSPENDED' },
    );

    const res = await api();
    const byCode = Object.fromEntries(
      res.body.map((a: { code: string }) => [a.code, a]),
    ) as Record<string, { status: string; membershipStatus: string }>;

    expect(byCode[CLOSED.code]!.status).toBe('SUSPENDED');
    expect(byCode[ATLAS.code]!.membershipStatus).toBe('SUSPENDED');
  });

  it('exposes only safe fields', async () => {
    DB.memberships.push({
      agencyId: SAHARA.id,
      appUserId: owner.id,
      membershipType: 'OWNER',
      status: 'ACTIVE',
    });

    const res = await api();
    expect(Object.keys(res.body[0]).sort()).toEqual([
      'code',
      'membershipStatus',
      'membershipType',
      'name',
      'status',
    ]);

    const serialized = JSON.stringify(res.body);
    for (const leak of ['"id"', 'systemKey', 'roles', 'permissions', 'passwordHash', 'appUserId']) {
      expect(serialized).not.toContain(leak);
    }
  });
});
