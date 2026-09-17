import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { AuthorizationModule } from './authorization.module.js';
import { RequirePermissions } from './require-permissions.decorator.js';
import { PermissionGuard } from './permission.guard.js';

type AssignmentShape = {
  role: { scope: string; permissions: Array<{ permission: { key: string } }> };
};

@Controller('protected')
class ProtectedController {
  @Get('user-view')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('PLATFORM_USER_VIEW')
  userView() {
    return { ok: true };
  }

  @Get('user-create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('PLATFORM_USER_CREATE')
  userCreate() {
    return { ok: true };
  }

  @Get('role-view')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('PLATFORM_ROLE_VIEW')
  roleView() {
    return { ok: true };
  }
}

const existingUser = {
  id: 1n,
  code: 'USR-ABCDEF123456',
  email: 'super@mail.com',
  passwordHash: 'mock-hashed-password',
  firstName: 'Ada',
  lastName: 'Lovelace',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const state: { assignments: AssignmentShape[] } = { assignments: [] };

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: bigint } }) => {
      if (where.email === existingUser.email || where.id === existingUser.id) {
        return existingUser;
      }
      return null;
    }),
  },
  platformRoleAssignment: {
    findMany: vi.fn(async () => state.assignments),
  },
};

function platformRole(name: string, keys: string[]): AssignmentShape {
  return {
    role: {
      scope: 'PLATFORM',
      permissions: keys.map((key) => ({ permission: { key } })),
    },
  };
}

describe('PermissionGuard (JWT + CASL + DB-driven permission.key)', () => {
  let app: INestApplication;
  let token: string;

  const cookie = (value: string): string => `travel_access_token=${value}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, AuthorizationModule],
      controllers: [ProtectedController],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    token = app.get(JwtService).sign({ sub: '1' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    state.assignments = [];
    vi.clearAllMocks();
  });

  it('returns 401 for an unauthenticated request (no cookie)', async () => {
    const res = await request(app.getHttpServer()).get('/v1/protected/user-view');
    expect(res.status).toBe(401);
  });

  it('allows an authenticated user whose PLATFORM role grants the required permission.key', async () => {
    state.assignments = [platformRole('PLATFORM_ADMIN', ['PLATFORM_USER_VIEW'])];
    const res = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 403 when the user lacks the required permission.key', async () => {
    state.assignments = [platformRole('PLATFORM_ADMIN', ['PLATFORM_ROLE_VIEW'])];
    const res = await request(app.getHttpServer())
      .get('/v1/protected/user-create')
      .set('Cookie', cookie(token));
    expect(res.status).toBe(403);
  });

  it('grants nothing to a role by name alone: SUPER_ADMIN with zero permissions cannot pass', async () => {
    state.assignments = [platformRole('SUPER_ADMIN', [])];
    const res = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(res.status).toBe(403);
  });

  it('loads PLATFORM role permissions from the database (scope filters enforced in the query)', async () => {
    state.assignments = [platformRole('PLATFORM_ADMIN', ['PLATFORM_USER_VIEW'])];
    const res = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(res.status).toBe(200);
    expect(prismaMock.platformRoleAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appUserId: 1n, role: { is: { scope: 'PLATFORM' } } },
        select: {
          role: {
            select: {
              permissions: expect.objectContaining({
                where: { permission: { is: { scope: 'PLATFORM' } } },
              }),
            },
          },
        },
      }),
    );
  });

  it('authorizes by permission.key: a user with PLATFORM_ROLE_VIEW passes role-view but is 403 on user-view', async () => {
    state.assignments = [platformRole('PLATFORM_ADMIN', ['PLATFORM_ROLE_VIEW'])];
    const roleRes = await request(app.getHttpServer())
      .get('/v1/protected/role-view')
      .set('Cookie', cookie(token));
    const userRes = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(roleRes.status).toBe(200);
    expect(userRes.status).toBe(403);
  });

  it('reflects RolePermission changes immediately without reissuing the JWT', async () => {
    state.assignments = [platformRole('PLATFORM_ADMIN', ['PLATFORM_USER_VIEW'])];
    const allowed = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(allowed.status).toBe(200);

    state.assignments = [platformRole('PLATFORM_ADMIN', [])];
    const denied = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(denied.status).toBe(403);
  });

  it('keeps passwordHash out of authorization and responses', async () => {
    state.assignments = [platformRole('PLATFORM_ADMIN', ['PLATFORM_USER_VIEW'])];
    const res = await request(app.getHttpServer())
      .get('/v1/protected/user-view')
      .set('Cookie', cookie(token));
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('passwordHash');
    const identity = res.text;
    expect(identity).not.toContain('mock-hashed-password');
  });

  it('keeps the JWT identity-only: sub claim only, no roles or permissions', () => {
    const decoded = app.get(JwtService).decode(token) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(decoded).not.toHaveProperty('roles');
    expect(decoded).not.toHaveProperty('permissions');
    expect(decoded).not.toHaveProperty('email');
    expect(decoded).not.toHaveProperty('passwordHash');
  });
});