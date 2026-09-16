import { ConflictException } from '@nestjs/common';
import { hash } from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';

vi.mock('argon2', () => ({
  hash: vi.fn(async () => 'mock-hashed-password'),
  verify: vi.fn(async () => true),
}));

const prismaMock = {
  appUser: {
    create: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
};

const jwtMock = {
  sign: vi.fn(() => 'signed-token'),
};

const row = {
  id: 1n,
  code: 'USR-ABCDEF123456',
  email: 'owner@example.com',
  passwordHash: 'mock-hashed-password',
  firstName: 'Ada',
  lastName: 'Lovelace',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtMock as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('hashes the password and creates an AppUser with an auto-generated code', async () => {
      prismaMock.appUser.create.mockResolvedValue(row);

      const result = await service.register({
        email: 'owner@example.com',
        password: 'secret123',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(hash).toHaveBeenCalledWith('secret123');

      const createData = prismaMock.appUser.create.mock.calls[0][0].data;
      expect(createData.email).toBe('owner@example.com');
      expect(createData.passwordHash).toBe('mock-hashed-password');
      expect(createData.passwordHash).not.toBe('secret123');
      expect(createData.code).toMatch(/^USR-[0-9A-F]{12}$/);
      expect(createData.firstName).toBe('Ada');
      expect(createData.lastName).toBe('Lovelace');

      expect(result).toEqual({
        code: 'USR-ABCDEF123456',
        email: 'owner@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate email with a machine-readable conflict error', async () => {
      const duplicateError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: '7.10.0', meta: { target: ['email'] } },
      );
      prismaMock.appUser.create.mockRejectedValue(duplicateError);

      await expect(
        service.register({ email: 'owner@example.com', password: 'secret123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.register({ email: 'owner@example.com', password: 'secret123' }),
      ).rejects.toMatchObject({
        response: {
          statusCode: 409,
          message: 'Email is already registered',
          errorCode: 'EMAIL_ALREADY_REGISTERED',
        },
      });
    });
  });

  describe('login', () => {
    it('signs a minimal JWT carrying only the immutable subject id', () => {
      const result = service.login({
        id: '1',
        code: 'USR-ABCDEF123456',
        email: 'owner@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(jwtMock.sign).toHaveBeenCalledWith({ sub: '1' });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });
  });
});