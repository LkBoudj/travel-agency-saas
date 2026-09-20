import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { SecurityModule } from '../security/security.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import {
  AGENCY_CODE_PARAM,
  AgencyPermissionGuard,
} from '../authorization/agency-permission.guard.js';
import { RequireAgencyPermissions } from '../authorization/require-agency-permissions.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { AgencyAccessModule } from './agency-access.module.js';

/**
 * Agency-scoped authorization, end to end over HTTP.
 *
 * The in-memory Prisma double models the pieces authorization depends on
 * (agency status, membership status, role scope and ownership, permission
 * scope). The database triggers that keep a cross-tenant assignment from being
 * written in the first place are verified directly against PostgreSQL — see the
 * `agency_role_assignment_scope` migration.
 */

type RoleRow = {
  id: bigint;
  key: string;
  name: string;
  scope: string;
  agencyId: bigint | null;
  permissionKeys: string[];
};

type AgencyRow = { id: bigint; code: string; name: string; status: string };

type MembershipRow = {
  id: bigint;
  agencyId: bigint;
  appUserId: bigint;
  membershipType: string;
  status: string;
  roleIds: bigint[];
};

const member = { id: 1n, code: 'USR-MEMBER000001', email: 'member@mail.com', status: 'ACTIVE' };
const outsider = { id: 2n, code: 'USR-OUTSIDER0001', email: 'outsider@mail.com', status: 'ACTIVE' };

const DB = {
  permissionScopes: new Map<string, string>(),
  roles: new Map<bigint, RoleRow>(),
  agencies: new Map<bigint, AgencyRow>(),
  memberships: [] as MembershipRow[],
  users: new Map<bigint, typeof member>(),
};

const SAHARA: AgencyRow = { id: 10n, code: 'AGY-SAHARA00001', name: 'Sahara Travel', status: 'ACTIVE' };
const ATLAS: AgencyRow = { id: 20n, code: 'AGY-ATLAS000001', name: 'Atlas Tours', status: 'ACTIVE' };

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
  permissionKeys: string[],
  name = key,
): RoleRow {
  const row: RoleRow = { id: id(), key, name, scope, agencyId, permissionKeys };
  DB.roles.set(row.id, row);
  return row;
}

/**
 * The catalog keys every permission by `<SCOPE>_<RESOURCE>_<ACTION>`, so the
 * prefix is the scope. Deriving it (instead of registering keys up front) lets a
 * test add a permission to an existing role mid-test, which is exactly how the
 * "no new JWT needed" case is exercised.
 */
function permissionScopeOf(key: string): string {
  return DB.permissionScopes.get(key) ?? (key.startsWith('PLATFORM_') ? 'PLATFORM' : 'AGENCY');
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
    roleIds,
    ...overrides,
  };
  DB.memberships.push(row)
  return row;
}

/** Mirrors the nested select AgencyPermissionsService issues. */
const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint } }) =>
      where.id === undefined ? null : (DB.users.get(where.id) ?? null),
    ),
  },
  agency: {
    findUnique: vi.fn(
      async (args: {
        where: { code: string }
        select: { members: { where: { appUserId: bigint } } }
      }) => {
        const agency = [...DB.agencies.values()].find((a) => a.code === args.where.code);
        if (!agency) return null;

        // The service narrows the membership sub-select to one user; the double
        // honours that, or the tenant-isolation tests would prove nothing.
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
                  // Mirrors the `permission.scope = AGENCY` filter in the query.
                  permissions: role.permissionKeys
                    .filter((key) => permissionScopeOf(key) === 'AGENCY')
                    .map((key) => ({ permission: { key } })),
                },
              };
            }),
          }));

        return { ...agency, members };
      },
    ),
  },
  platformRoleAssignment: {
    findMany: vi.fn(async () => []),
  },
};

/** A route that exists only to exercise the guard; it is not a business feature. */
@Controller(`agencies/:${AGENCY_CODE_PARAM}`)
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
class GuardProbeController {
  @Get('probe-bookings')
  @RequireAgencyPermissions('AGENCY_BOOKING_VIEW')
  bookings(): { ok: true } {
    return { ok: true };
  }

  @Get('probe-two')
  @RequireAgencyPermissions('AGENCY_BOOKING_VIEW', 'AGENCY_TOUR_VIEW')
  two(): { ok: true } {
    return { ok: true };
  }
}

function baseline(): void {
  DB.permissionScopes.clear();
  DB.roles.clear();
  DB.agencies.clear();
  DB.memberships = [];
  DB.users.clear();
  nextId = 100n;

  DB.agencies.set(SAHARA.id, { ...SAHARA });
  DB.agencies.set(ATLAS.id, { ...ATLAS });
  for (const user of [member, outsider]) {
    DB.users.set(user.id, { ...user });
  }
  DB.permissionScopes.set('PLATFORM_AGENCY_VIEW', 'PLATFORM');
}

describe('Agency authorization (context + guard)', () => {
  let app: INestApplication;
  let memberToken: string;
  let outsiderToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        SecurityModule,
        AuthorizationModule,
        AgencyAccessModule,
      ],
      controllers: [GuardProbeController],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    memberToken = jwt.sign({ sub: member.id.toString() });
    outsiderToken = jwt.sign({ sub: outsider.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const cookie = (value: string) => `travel_access_token=${value}`;
  const as = (token: string) => ({
    get: (path: string) =>
      request(app.getHttpServer()).get(path).set('Cookie', cookie(token)),
  });

  const me = (code: string) => `/v1/agencies/${code}/me`;

  // ----------------------------------------------------------- authentication

  it('401 without a JWT', async () => {
    const res = await request(app.getHttpServer()).get(me(SAHARA.code));
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------- agency resolution

  it('404 AGENCY_NOT_FOUND for an unknown agency', async () => {
    const res = await as(memberToken).get(me('AGY-DOESNOTEXIST'));
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('AGENCY_NOT_FOUND');
  });

  it('403 AGENCY_SUSPENDED for a suspended agency, even for its own member', async () => {
    DB.agencies.get(SAHARA.id)!.status = 'SUSPENDED';
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [role.id], { membershipType: 'OWNER' });

    const res = await as(memberToken).get(me(SAHARA.code));
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_SUSPENDED');
  });

  // -------------------------------------------------------------- membership

  it('allows an ACTIVE member', async () => {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [role.id]);

    const res = await as(memberToken).get(me(SAHARA.code));
    expect(res.status).toBe(200);
    expect(res.body.agency.code).toBe(SAHARA.code);
  });

  it('403 AGENCY_MEMBERSHIP_REQUIRED without a membership', async () => {
    const res = await as(outsiderToken).get(me(SAHARA.code));
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');
  });

  it('403 AGENCY_MEMBERSHIP_INACTIVE for a suspended membership', async () => {
    const role = addRole('AGENCY_ACCOUNTANT', 'AGENCY', null, ['AGENCY_PAYMENT_VIEW']);
    addMembership(SAHARA.id, member.id, [role.id], { status: 'SUSPENDED' });

    const res = await as(memberToken).get(me(SAHARA.code));
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_MEMBERSHIP_INACTIVE');
  });

  // ------------------------------------------------------------- permissions

  it('allows a request whose required permission is granted', async () => {
    const role = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [role.id]);

    const res = await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`);
    expect(res.status).toBe(200);
  });

  it('403 AGENCY_PERMISSION_DENIED when the permission is missing', async () => {
    const role = addRole('AGENCY_ACCOUNTANT', 'AGENCY', null, ['AGENCY_PAYMENT_VIEW']);
    addMembership(SAHARA.id, member.id, [role.id]);

    const res = await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('requires ALL declared permissions', async () => {
    const role = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, ['AGENCY_BOOKING_VIEW']);
    const membership = addMembership(SAHARA.id, member.id, [role.id]);

    expect((await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-two`)).status).toBe(403);

    const tours = addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, ['AGENCY_TOUR_VIEW']);
    membership.roleIds.push(tours.id);

    expect((await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-two`)).status).toBe(200);
  });

  it('unions and deduplicates permissions across roles', async () => {
    const a = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, [
      'AGENCY_BOOKING_VIEW',
      'AGENCY_CUSTOMER_VIEW',
    ]);
    const b = addRole('AGENCY_TOUR_MANAGER', 'AGENCY', null, [
      'AGENCY_BOOKING_VIEW',
      'AGENCY_TOUR_VIEW',
    ]);
    addMembership(SAHARA.id, member.id, [a.id, b.id]);

    const res = await as(memberToken).get(me(SAHARA.code));
    expect(res.body.permissions).toEqual([
      'AGENCY_BOOKING_VIEW',
      'AGENCY_CUSTOMER_VIEW',
      'AGENCY_TOUR_VIEW',
    ]);
  });

  // ------------------------------------------------------------------ scopes

  it('a PLATFORM role on the membership grants no agency access', async () => {
    const platform = addRole('PLATFORM_ADMIN', 'PLATFORM', null, ['PLATFORM_AGENCY_VIEW']);
    addMembership(SAHARA.id, member.id, [platform.id]);

    const context = await as(memberToken).get(me(SAHARA.code));
    expect(context.body.permissions).toEqual([]);
    expect(context.body.roles).toEqual([]);

    const guarded = await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`);
    expect(guarded.status).toBe(403);
  });

  // --------------------------------------------------------- tenant isolation

  it('a membership in Sahara gives no access to Atlas', async () => {
    const powerful = addRole('AGENCY_OWNER', 'AGENCY', null, [
      'AGENCY_BOOKING_VIEW',
      'AGENCY_TOUR_VIEW',
    ]);
    addMembership(SAHARA.id, member.id, [powerful.id], { membershipType: 'OWNER' });

    expect((await as(memberToken).get(me(SAHARA.code))).status).toBe(200);

    const atlas = await as(memberToken).get(me(ATLAS.code));
    expect(atlas.status).toBe(403);
    expect(atlas.body.errorCode).toBe('AGENCY_MEMBERSHIP_REQUIRED');

    const guarded = await as(memberToken).get(`/v1/agencies/${ATLAS.code}/probe-bookings`);
    expect(guarded.status).toBe(403);
  });

  it("a custom role owned by Atlas grants nothing inside Sahara", async () => {
    const atlasRole = addRole('ATLAS_SUPERUSER', 'AGENCY', ATLAS.id, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [atlasRole.id]);

    const context = await as(memberToken).get(me(SAHARA.code));
    expect(context.body.permissions).toEqual([]);

    const guarded = await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`);
    expect(guarded.status).toBe(403);
  });

  it('a custom role owned by Sahara works inside Sahara', async () => {
    const saharaRole = addRole('SAHARA_NIGHT_DESK', 'AGENCY', SAHARA.id, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [saharaRole.id]);

    const guarded = await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`);
    expect(guarded.status).toBe(200);
  });

  it('a global agency role works in each agency it is assigned through', async () => {
    const global = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [global.id]);
    addMembership(ATLAS.id, member.id, [global.id]);

    expect(
      (await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`)).status,
    ).toBe(200);
    expect(
      (await as(memberToken).get(`/v1/agencies/${ATLAS.code}/probe-bookings`)).status,
    ).toBe(200);
  });

  // ------------------------------------------------------------- multi-agency

  it('resolves different permissions for the same user in two agencies', async () => {
    const owner = addRole('AGENCY_OWNER', 'AGENCY', null, ['AGENCY_TOUR_MANAGE']);
    const accountant = addRole('AGENCY_ACCOUNTANT', 'AGENCY', null, ['AGENCY_PAYMENT_VIEW']);
    addMembership(SAHARA.id, member.id, [owner.id], { membershipType: 'OWNER' });
    addMembership(ATLAS.id, member.id, [accountant.id]);

    const sahara = await as(memberToken).get(me(SAHARA.code));
    const atlas = await as(memberToken).get(me(ATLAS.code));

    expect(sahara.body.permissions).toEqual(['AGENCY_TOUR_MANAGE']);
    expect(sahara.body.membership.membershipType).toBe('OWNER');
    expect(atlas.body.permissions).toEqual(['AGENCY_PAYMENT_VIEW']);
    expect(atlas.body.membership.membershipType).toBe('EMPLOYEE');
  });

  // -------------------------------------------------------------------- owner

  it('gives an OWNER no bypass: access comes from the role permissions', async () => {
    const ownerRole = addRole('AGENCY_OWNER', 'AGENCY', null, ['AGENCY_BOOKING_VIEW']);
    addMembership(SAHARA.id, member.id, [ownerRole.id], { membershipType: 'OWNER' });

    expect(
      (await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`)).status,
    ).toBe(200);

    // Same OWNER, same JWT — the role simply no longer grants the permission.
    ownerRole.permissionKeys = [];

    const after = await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`);
    expect(after.status).toBe(403);
    expect(after.body.errorCode).toBe('AGENCY_PERMISSION_DENIED');
  });

  it('applies a permission change without issuing a new JWT', async () => {
    const role = addRole('AGENCY_BOOKING_AGENT', 'AGENCY', null, []);
    addMembership(SAHARA.id, member.id, [role.id]);

    expect(
      (await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`)).status,
    ).toBe(403);

    role.permissionKeys = ['AGENCY_BOOKING_VIEW'];

    expect(
      (await as(memberToken).get(`/v1/agencies/${SAHARA.code}/probe-bookings`)).status,
    ).toBe(200);
  });

  // --------------------------------------------------------- context contract

  it('returns safe context data only', async () => {
    const role = addRole('AGENCY_OWNER', 'AGENCY', null, ['AGENCY_BOOKING_VIEW'], 'Agency Owner');
    addMembership(SAHARA.id, member.id, [role.id], { membershipType: 'OWNER' });

    const res = await as(memberToken).get(me(SAHARA.code));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      agency: { code: SAHARA.code, name: SAHARA.name, status: 'ACTIVE' },
      membership: { membershipType: 'OWNER', status: 'ACTIVE' },
      roles: [{ key: 'AGENCY_OWNER', name: 'Agency Owner' }],
      permissions: ['AGENCY_BOOKING_VIEW'],
    });

    const serialized = JSON.stringify(res.body);
    for (const leak of ['systemKey', 'passwordHash', 'agencyId', 'membershipId', 'roleId', '"id"']) {
      expect(serialized).not.toContain(leak);
    }
  });
});
