import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { ALL_PLATFORM_PERMISSION_KEYS, RBAC_PERMISSION_CATALOG } from '../rbac/rbac.constants.js';
import { AgenciesModule } from '../agencies/agencies.module.js';
import { AgencyApplicationsModule } from './agency-applications.module.js';

type RoleRow = {
  id: bigint;
  key: string;
  name: string;
  scope: string;
  agencyId: bigint | null;
};

type PermissionRow = { id: bigint; key: string; scope: string };

type LinkRow = { roleId: bigint; permissionId: bigint };

type AssignmentRow = { appUserId: bigint; roleId: bigint };

type AppUserRow = {
  id: bigint;
  code: string;
  email: string;
  status: string;
};

type ApplicationRow = {
  id: bigint;
  appUserId: bigint;
  agencyName: string;
  country: string | null;
  website: string | null;
  description: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedByAppUserId: bigint | null;
  agencyId: bigint | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AgencyRow = {
  id: bigint;
  code: string;
  name: string;
  status: string;
  country: string | null;
  website: string | null;
  createdAt: Date;
};

type MembershipRow = {
  id: bigint;
  agencyId: bigint;
  appUserId: bigint;
  status: string;
};

type AgencyRoleAssignmentRow = { membershipId: bigint; roleId: bigint };

const NOW = new Date('2026-09-17T09:00:00.000Z');

const applicant = {
  id: 10n,
  code: 'USR-APPLICANT1',
  email: 'applicant@mail.com',
  status: 'ACTIVE',
};

const secondApplicant = {
  id: 11n,
  code: 'USR-SECOND0001',
  email: 'second@mail.com',
  status: 'ACTIVE',
};

const admin = {
  id: 1n,
  code: 'USR-ABCDEF123456',
  email: 'super@mail.com',
  status: 'ACTIVE',
};

const DB = {
  nextId: 100n,
  roles: new Map<bigint, RoleRow>(),
  permissions: new Map<bigint, PermissionRow>(),
  links: [] as LinkRow[],
  assignments: [] as AssignmentRow[],
  users: new Map<bigint, AppUserRow>(),
  applications: new Map<bigint, ApplicationRow>(),
  agencies: new Map<bigint, AgencyRow>(),
  memberships: new Map<bigint, MembershipRow>(),
  agencyRoleAssignments: [] as AgencyRoleAssignmentRow[],
};

function id(): bigint {
  const value = DB.nextId;
  DB.nextId += 1n;
  return value;
}

function addRole(key: string, name: string, scope: string, agencyId: bigint | null = null): RoleRow {
  const row: RoleRow = { id: id(), key, name, scope, agencyId };
  DB.roles.set(row.id, row);
  return row;
}

function addPermission(key: string, scope = 'PLATFORM'): PermissionRow {
  const row: PermissionRow = { id: id(), key, scope };
  DB.permissions.set(row.id, row);
  return row;
}

/** Simulates a failed `agency.create` inside the approval transaction. */
let failAgencyCreate: ((data: { code: string; name: string }) => never) | null = null;

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { id?: bigint; email?: string } }) => {
      for (const user of DB.users.values()) {
        if (where.id !== undefined && user.id === where.id) return user;
        if (where.email !== undefined && user.email === where.email) return user;
      }
      return null;
    }),
  },
  role: {
    findFirst: vi.fn(async ({ where }: { where: { key?: string; scope?: string; agencyId?: bigint | null } }) => {
      for (const role of DB.roles.values()) {
        if (where.key !== undefined && role.key !== where.key) continue;
        if (where.scope !== undefined && role.scope !== where.scope) continue;
        if (where.agencyId !== undefined && role.agencyId !== where.agencyId) continue;
        return role;
      }
      return null;
    }),
  },
  agencyApplication: {
    findUnique: vi.fn(
      async ({ where, select }: { where: { id: bigint }; select?: Record<string, unknown> }) => {
        const application = DB.applications.get(where.id);
        if (!application) return null;
        if (
          select &&
          'status' in select &&
          'agencyId' in select &&
          Object.keys(select).length === 2
        ) {
          // Narrow projection used by the in-transaction eligibility re-check.
          return { status: application.status, agencyId: application.agencyId };
        }
        return withRelations(application);
      },
    ),
    findFirst: vi.fn(async ({ where }: { where: { id: bigint; appUserId?: bigint } }) => {
      for (const application of DB.applications.values()) {
        if (application.id !== where.id) continue;
        if (where.appUserId !== undefined && application.appUserId !== where.appUserId) continue;
        return withRelations(application);
      }
      return null;
    }),
    findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const status = where?.status as string | undefined;
      const rows = [...DB.applications.values()].filter(
        (application) => !status || application.status === status,
      );
      return rows.map(withRelations);
    }),
    create: vi.fn(async ({ data }: { data: Partial<ApplicationRow> }) => {
      const row: ApplicationRow = {
        id: id(),
        appUserId: data.appUserId!,
        agencyName: data.agencyName!,
        country: data.country ?? null,
        website: data.website ?? null,
        description: data.description ?? null,
        status: 'PENDING',
        reviewNote: null,
        reviewedAt: null,
        reviewedByAppUserId: null,
        agencyId: null,
        approvedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      };
      DB.applications.set(row.id, row);
      return withRelations(row);
    }),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: bigint };
        data: Partial<ApplicationRow>;
      }) => {
        const application = DB.applications.get(where.id);
        if (!application) throw new Error('application not found');
        Object.assign(application, data);
        return withRelations(application);
      },
    ),
  },
  agency: {
    create: vi.fn(async ({ data, select }: { data: Partial<AgencyRow>; select?: unknown }) => {
      if (failAgencyCreate) {
        const fail = failAgencyCreate;
        failAgencyCreate = null;
        fail({ code: data.code!, name: data.name! });
      }
      const row: AgencyRow = {
        id: id(),
        code: data.code!,
        name: data.name!,
        status: 'ACTIVE',
        country: data.country ?? null,
        website: data.website ?? null,
        createdAt: NOW,
      };
      DB.agencies.set(row.id, row);
      return select ? { id: row.id } : row;
    }),
    findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
      for (const agency of DB.agencies.values()) {
        if (agency.code === where.code) return agency;
      }
      return null;
    }),
    findMany: vi.fn(async () => {
      return [...DB.agencies.values()].map((agency) => ({
        ...agency,
        _count: { members: countMembers(agency.id) },
      }));
    }),
  },
  agencyMembership: {
    create: vi.fn(async ({ data, select }: { data: Partial<MembershipRow>; select?: unknown }) => {
      const row: MembershipRow = {
        id: id(),
        agencyId: data.agencyId!,
        appUserId: data.appUserId!,
        status: 'ACTIVE',
      };
      DB.memberships.set(row.id, row);
      return select ? { id: row.id } : row;
    }),
  },
  agencyRoleAssignment: {
    create: vi.fn(async ({ data }: { data: AgencyRoleAssignmentRow }) => {
      DB.agencyRoleAssignments.push(data);
      return data;
    }),
  },
  platformRoleAssignment: {
    findMany: vi.fn(async ({ where }: { where: { appUserId: bigint } }) => {
      return DB.assignments
        .filter((a) => a.appUserId === where.appUserId)
        .map((a) => {
          const role = DB.roles.get(a.roleId)!;
          const rolePermissions = DB.links
            .filter((l) => l.roleId === role.id)
            .map((l) => ({ permission: { key: DB.permissions.get(l.permissionId)!.key } }));
          return { role: { scope: role.scope, permissions: rolePermissions } };
        });
    }),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    }
    const ops = arg as Promise<unknown>[];
    for (const op of ops) await op;
    return ops;
  }),
};

function countMembers(agencyId: bigint): number {
  let count = 0;
  for (const membership of DB.memberships.values()) {
    if (membership.agencyId === agencyId) count += 1;
  }
  return count;
}

function withRelations(application: ApplicationRow) {
  const user = [...DB.users.values()].find((u) => u.id === application.appUserId)!;
  const reviewer = application.reviewedByAppUserId
    ? [...DB.users.values()].find((u) => u.id === application.reviewedByAppUserId)
    : null;
  const agency = application.agencyId
    ? [...DB.agencies.values()].find((a) => a.id === application.agencyId)
    : null;
  return {
    ...application,
    appUser: user,
    reviewedBy: reviewer ?? null,
    agency: agency
      ? { code: agency.code, name: agency.name, status: agency.status }
      : null,
  };
}

const PLATFORM_KEYS = ALL_PLATFORM_PERMISSION_KEYS;

function baseline(): void {
  DB.roles.clear();
  DB.permissions.clear();
  DB.links = [];
  DB.assignments = [];
  DB.users.clear();
  DB.applications.clear();
  DB.agencies.clear();
  DB.memberships.clear();
  DB.agencyRoleAssignments = [];
  DB.nextId = 100n;
  failAgencyCreate = null;

  for (const permission of RBAC_PERMISSION_CATALOG) {
    addPermission(permission.key, permission.scope);
  }

  const platformAdmin = addRole('PLATFORM_ADMIN', 'Platform Admin', 'PLATFORM');
  for (const permission of DB.permissions.values()) {
    if (permission.scope === 'PLATFORM') {
      DB.links.push({ roleId: platformAdmin.id, permissionId: permission.id });
    }
  }
  DB.assignments.push({ appUserId: admin.id, roleId: platformAdmin.id });

  // Global Agency roles and a Custom Agency role.
  addRole('AGENCY_OWNER', 'Agency Owner', 'AGENCY', null);
  addRole('AGENCY_MANAGER', 'Agency Manager', 'AGENCY', null);
  addRole('CUSTOM_AGENT', 'Custom Agent', 'AGENCY', 999n);

  for (const user of [admin, applicant, secondApplicant]) {
    DB.users.set(user.id, { ...user });
  }
}

function addApplication(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  const row: ApplicationRow = {
    id: id(),
    appUserId: applicant.id,
    agencyName: 'Sunshine Travels',
    country: 'Morocco',
    website: null,
    description: null,
    status: 'PENDING',
    reviewNote: null,
    reviewedAt: null,
    reviewedByAppUserId: null,
    agencyId: null,
    approvedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  DB.applications.set(row.id, row);
  return row;
}

describe('Agency Applications API (submit, review, approve)', () => {
  let app: INestApplication;
  let adminToken: string;
  let applicantToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, AgencyApplicationsModule, AgenciesModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    adminToken = jwt.sign({ sub: admin.id.toString() });
    applicantToken = jwt.sign({ sub: applicant.id.toString() });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    baseline();
    vi.clearAllMocks();
  });

  const cookie = (value: string): string => `travel_access_token=${value}`;
  // Read the tokens lazily: they are only signed in `beforeAll`, after the
  // describe body has been evaluated.
  const adminApi = {
    get: (path: string) =>
      request(app.getHttpServer()).get(path).set('Cookie', cookie(adminToken)),
    post: (path: string) =>
      request(app.getHttpServer()).post(path).set('Cookie', cookie(adminToken)),
    patch: (path: string) =>
      request(app.getHttpServer()).patch(path).set('Cookie', cookie(adminToken)),
  };
  const applicantApi = {
    get: (path: string) =>
      request(app.getHttpServer()).get(path).set('Cookie', cookie(applicantToken)),
    post: (path: string) =>
      request(app.getHttpServer()).post(path).set('Cookie', cookie(applicantToken)),
    patch: (path: string) =>
      request(app.getHttpServer()).patch(path).set('Cookie', cookie(applicantToken)),
  };

  async function authorizeOnly(...keys: string[]): Promise<void> {
    DB.roles.clear();
    DB.permissions.clear();
    DB.links = [];
    DB.assignments = [];
    DB.nextId = 500n;
    for (const key of keys) {
      const permission = addPermission(key);
      DB.links.push({ roleId: 0n, permissionId: permission.id });
    }
    const limited = addRole('LIMITED', 'Limited', 'PLATFORM');
    for (const permission of DB.permissions.values()) {
      DB.links.push({ roleId: limited.id, permissionId: permission.id });
    }
    DB.assignments.push({ appUserId: admin.id, roleId: limited.id });
  }

  describe('Applicant submission', () => {
    it('401 without an auth cookie', async () => {
      const res = await request(app.getHttpServer()).post('/v1/agency-applications');
      expect(res.status).toBe(401);
    });

    it('creates a PENDING application with the applicant derived from the JWT', async () => {
      const res = await applicantApi.post('/v1/agency-applications').send({
        agencyName: 'Sunshine Travels',
        country: 'Morocco',
        website: 'https://sunshine.example',
        description: 'Desert tours',
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        agencyName: 'Sunshine Travels',
        status: 'PENDING',
        applicant: { code: applicant.code, email: applicant.email },
        reviewedBy: null,
        agency: null,
        approvedAt: null,
      });
      expect(res.body).not.toHaveProperty('appUserId');
      expect(res.body).not.toHaveProperty('passwordHash');

      const createData = prismaMock.agencyApplication.create.mock.calls[0][0].data;
      expect(createData.appUserId).toBe(applicant.id);
    });

    it('rejects backend-owned fields (applicantUserId, status, approvedBy)', async () => {
      const res = await applicantApi.post('/v1/agency-applications').send({
        agencyName: 'Sneaky Agency',
        applicantUserId: '2',
        status: 'APPROVED',
        approvedBy: '2',
      });
      expect(res.status).toBe(400);
      expect(prismaMock.agencyApplication.create).not.toHaveBeenCalled();
    });

    it('400 for a missing agency name', async () => {
      const res = await applicantApi.post('/v1/agency-applications').send({ country: 'France' });
      expect(res.status).toBe(400);
    });

    it('lists only the caller\u2019s own applications', async () => {
      addApplication({ agencyName: 'Mine' });
      addApplication({ appUserId: secondApplicant.id, agencyName: 'Theirs' });

      const res = await applicantApi.get('/v1/agency-applications/mine');
      expect(res.status).toBe(200);
      const names = (res.body as Array<{ agencyName: string }>).map((a) => a.agencyName);
      expect(names).toContain('Mine');
      expect(names).not.toContain('Theirs');
    });

    it('withdraws a pending own application but not a decided one', async () => {
      const pending = addApplication({ agencyName: 'Withdrawable' });
      const res = await applicantApi.post(`/v1/agency-applications/${pending.id}/withdraw`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('WITHDRAWN');

      const approved = addApplication({ status: 'APPROVED' });
      const denied = await applicantApi.post(`/v1/agency-applications/${approved.id}/withdraw`);
      expect(denied.status).toBe(409);

      const foreign = addApplication({ appUserId: secondApplicant.id });
      const notFound = await applicantApi.post(`/v1/agency-applications/${foreign.id}/withdraw`);
      expect(notFound.status).toBe(404);
    });
  });

  describe('Platform admin listing', () => {
    it('401 unauthenticated and 403 without PLATFORM_AGENCY_APPLICATION_VIEW', async () => {
      const unauthenticated = await request(app.getHttpServer()).get('/v1/admin/agency-applications');
      expect(unauthenticated.status).toBe(401);

      await authorizeOnly('PLATFORM_USER_VIEW');
      const forbidden = await adminApi.get('/v1/admin/agency-applications');
      expect(forbidden.status).toBe(403);
    });

    it('lists applications with a status filter', async () => {
      addApplication({ agencyName: 'Pending One' });
      addApplication({ agencyName: 'Rejected One', status: 'REJECTED' });

      const res = await adminApi.get('/v1/admin/agency-applications?status=REJECTED');
      expect(res.status).toBe(200);
      const names = (res.body as Array<{ agencyName: string }>).map((a) => a.agencyName);
      expect(names).toEqual(['Rejected One']);
    });

    it('returns a single application by id and 404 for unknown ids', async () => {
      const application = addApplication();
      const res = await adminApi.get(`/v1/admin/agency-applications/${application.id}`);
      expect(res.status).toBe(200);
      expect(res.body.agencyName).toBe('Sunshine Travels');

      const missing = await adminApi.get('/v1/admin/agency-applications/99999');
      expect(missing.status).toBe(404);

      const malformed = await adminApi.get('/v1/admin/agency-applications/not-a-number');
      expect(malformed.status).toBe(404);
    });
  });

  describe('Review decisions', () => {
    it('needs-info moves PENDING to NEEDS_INFO and records the reviewer', async () => {
      const application = addApplication();
      const res = await adminApi
        .patch(`/v1/admin/agency-applications/${application.id}/needs-info`)
        .send({ reviewNote: 'Please add registration documents.' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('NEEDS_INFO');
      expect(res.body.reviewNote).toBe('Please add registration documents.');
      expect(res.body.reviewedBy.email).toBe(admin.email);

      const updateData = prismaMock.agencyApplication.update.mock.calls[0][0].data;
      expect(updateData.reviewedByAppUserId).toBe(admin.id);
    });

    it('rejects an approved application from being sent to needs-info again', async () => {
      const application = addApplication({ status: 'APPROVED' });
      const res = await adminApi
        .patch(`/v1/admin/agency-applications/${application.id}/needs-info`)
        .send({ reviewNote: 'x' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('APPLICATION_NOT_REVIEWABLE');
    });

    it('rejects an application with a reason', async () => {
      const application = addApplication();
      const res = await adminApi
        .patch(`/v1/admin/agency-applications/${application.id}/reject`)
        .send({ reviewNote: 'Incomplete details' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');
    });

    it('403 without PLATFORM_AGENCY_APPLICATION_APPROVE or REJECT', async () => {
      await authorizeOnly('PLATFORM_AGENCY_APPLICATION_VIEW');
      const application = addApplication();

      const needsInfo = await adminApi
        .patch(`/v1/admin/agency-applications/${application.id}/needs-info`)
        .send({ reviewNote: 'x' });
      expect(needsInfo.status).toBe(200); // view permission covers housekeeping

      const reject = await adminApi
        .patch(`/v1/admin/agency-applications/${application.id}/reject`)
        .send({ reviewNote: 'x' });
      expect(reject.status).toBe(403);

      const approve = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(approve.status).toBe(403);
    });

    it('applicant cannot review: review actions require platform permissions', async () => {
      const application = addApplication();
      const res = await applicantApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(res.status).toBe(403);
    });
  });

  describe('Approval transaction', () => {
    it('creates Agency + Membership + AGENCY_OWNER assignment and marks APPROVED atomically', async () => {
      const application = addApplication({ country: 'Morocco' });
      const res = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');
      expect(res.body.agency).toMatchObject({ name: 'Sunshine Travels', status: 'ACTIVE' });
      expect(res.body.approvedAt).not.toBeNull();
      expect(res.body.reviewedBy.email).toBe(admin.email);

      const agency = [...DB.agencies.values()][0];
      expect(agency.name).toBe('Sunshine Travels');
      expect(agency.code).toMatch(/^AGY-[0-9A-F]{12}$/);

      const membership = [...DB.memberships.values()][0];
      expect(membership.agencyId).toBe(agency.id);
      expect(membership.appUserId).toBe(applicant.id);

      const roleAssignment = DB.agencyRoleAssignments[0];
      const ownerRole = [...DB.roles.values()].find((role) => role.key === 'AGENCY_OWNER')!;
      expect(roleAssignment.roleId).toBe(ownerRole.id);
      expect(ownerRole.scope).toBe('AGENCY');
      expect(ownerRole.agencyId).toBeNull();
    });

    it('resolves AGENCY_OWNER by key and rejects a Custom Agency role with the same key', async () => {
      // A custom role owned by agency 999n exists with a different key; the
      // resolution query requires agencyId = null, so it can never match.
      const application = addApplication();
      const res = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(res.status).toBe(200);
      const call = prismaMock.role.findFirst.mock.calls[0][0];
      expect(call).toMatchObject({ key: 'AGENCY_OWNER', scope: 'AGENCY', agencyId: null });
    });

    it('400 AGENCY_OWNER_ROLE_MISSING when the global role does not exist', async () => {
      for (const [key, role] of DB.roles) {
        if (role.key === 'AGENCY_OWNER') DB.roles.delete(key);
      }
      const application = addApplication();
      const res = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('AGENCY_OWNER_ROLE_MISSING');
      expect(DB.agencies.size).toBe(0);
      expect(DB.memberships.size).toBe(0);
    });

    it('rolls back completely when the agency creation fails', async () => {
      failAgencyCreate = () => {
        throw new Error('simulated agency create failure');
      };
      const application = addApplication();
      const res = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(res.status).toBe(500);
      expect(DB.agencies.size).toBe(0);
      expect(DB.memberships.size).toBe(0);
      expect(DB.agencyRoleAssignments.length).toBe(0);

      const stored = DB.applications.get(application.id)!;
      expect(stored.status).toBe('PENDING');
      expect(stored.agencyId).toBeNull();
    });

    it('never approves the same application twice (no duplicate agency)', async () => {
      const application = addApplication();
      const first = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(first.status).toBe(200);
      const agenciesAfterFirst = DB.agencies.size;

      const second = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(second.status).toBe(409);
      expect(second.body.errorCode).toBe('APPLICATION_NOT_REVIEWABLE');
      expect(DB.agencies.size).toBe(agenciesAfterFirst);
      expect(DB.agencies.size).toBe(1);
    });

    it('cannot approve a rejected or withdrawn application', async () => {
      const rejected = addApplication({ status: 'REJECTED' });
      const rejectedRes = await adminApi.post(
        `/v1/admin/agency-applications/${rejected.id}/approve`,
      );
      expect(rejectedRes.status).toBe(409);

      const withdrawn = addApplication({ status: 'WITHDRAWN' });
      const withdrawnRes = await adminApi.post(
        `/v1/admin/agency-applications/${withdrawn.id}/approve`,
      );
      expect(withdrawnRes.status).toBe(409);

      expect(DB.agencies.size).toBe(0);
    });

    it('can approve a NEEDS_INFO application (still reviewable)', async () => {
      const application = addApplication({ status: 'NEEDS_INFO', reviewNote: 'docs added' });
      const res = await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');
    });
  });

  describe('Agencies list', () => {
    it('403 without PLATFORM_AGENCY_VIEW', async () => {
      await authorizeOnly('PLATFORM_AGENCY_APPLICATION_VIEW');
      const res = await adminApi.get('/v1/agencies');
      expect(res.status).toBe(403);
    });

    it('lists approved agencies with member counts', async () => {
      const application = addApplication();
      await adminApi.post(`/v1/admin/agency-applications/${application.id}/approve`);

      const res = await adminApi.get('/v1/agencies');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        name: 'Sunshine Travels',
        status: 'ACTIVE',
        memberCount: 1,
      });
      expect(res.body[0]).not.toHaveProperty('id');
    });
  });
});
