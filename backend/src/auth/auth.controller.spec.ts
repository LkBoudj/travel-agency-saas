import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { AUTH_COOKIE_NAME } from './auth.constants.js';

vi.mock('argon2', () => ({
  hash: vi.fn(async () => 'mock-hashed-password'),
  verify: vi.fn(async (_digest: string, password: string) => password === 'correct-password'),
}));

// JWT_SECRET is injected for tests via vitest.config.ts `test.env`;
// setting it here would be too late (ESM imports are hoisted above it).
const existingUser = {
  id: 1n,
  code: 'USR-ABCDEF123456',
  email: 'owner@example.com',
  passwordHash: 'mock-hashed-password',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  appUser: {
    findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: bigint } }) => {
      if (where.email === existingUser.email || where.id === existingUser.id) {
        return existingUser;
      }
      return null;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...existingUser,
      ...data,
    })),
    count: vi.fn(async () => 1),
  },
};

describe('Auth API (POST /v1/auth/login, POST /v1/auth/logout, GET /v1/auth/me)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('login', () => {
    it('logs in, sets an HttpOnly cookie, and keeps the JWT out of the response body', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'owner@example.com', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 'USR-ABCDEF123456',
        email: 'owner@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.body).not.toHaveProperty('token');

      const setCookie = res.headers['set-cookie'] as string[] | undefined;
      expect(setCookie).toBeDefined();
      const authCookie = setCookie!.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toMatch(/HttpOnly/i);
      expect(authCookie).toMatch(/SameSite=Lax/i);
      expect(authCookie).not.toMatch(/Secure/i);

      token = authCookie!.split(';')[0].split('=')[1];
    });

    it('rejects an invalid password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'owner@example.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });

    it('rejects an unknown email with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'ghost@example.com', password: 'correct-password' });

      expect(res.status).toBe(401);
    });
  });

  describe('JWT payload', () => {
    it('contains only the subject plus standard claims — no roles, permissions, email, or password data', async () => {
      const decoded = app.get(JwtService).decode(token);

      expect(decoded).toMatchObject({ sub: '1' });
      expect(decoded).not.toHaveProperty('roles');
      expect(decoded).not.toHaveProperty('permissions');
      expect(decoded).not.toHaveProperty('email');
      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('passwordHash');
    });
  });

  describe('me', () => {
    it('returns the authenticated safe user when a valid JWT cookie is present', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 'USR-ABCDEF123456',
        email: 'owner@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('returns 401 when the JWT cookie is missing', async () => {
      const res = await request(app.getHttpServer()).get('/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns 401 when the JWT cookie is invalid', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=not.a.jwt`);

      expect(res.status).toBe(401);
    });

    it('returns 401 when the JWT cookie is expired', async () => {
      const expiredToken = app.get(JwtService).sign({ sub: '1' }, { expiresIn: '-1s' });

      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('returns 401 when the JWT subject does not exist', async () => {
      const orphanToken = app.get(JwtService).sign({ sub: '999' });

      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${orphanToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe('logout', () => {
    it('clears the authentication cookie', async () => {
      const res = await request(app.getHttpServer()).post('/v1/auth/logout');

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'] as string[] | undefined;
      expect(setCookie).toBeDefined();
      const authCookie = setCookie!.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
      expect(authCookie).toMatch(/HttpOnly/i);
    });

    it('/me returns 401 when the cleared cookie is replayed', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=`);

      expect(res.status).toBe(401);
    });
  });
});