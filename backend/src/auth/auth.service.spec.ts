import { AppUserIdentityService } from './app-user-identity.service.js';
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
  id: '1',
  code: 'USR-ABCDEF123456',
  email: 'owner@example.com',
  passwordHash: 'mock-hashed-password',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'ACTIVE',
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
      new AppUserIdentityService(),
    );
  });

  describe('login', () => {
    it('signs a minimal JWT carrying only the immutable subject id', () => {
      const result = service.login({
        id: '1',
        code: 'USR-ABCDEF123456',
        email: 'owner@example.com',
        status: 'ACTIVE',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(jwtMock.sign).toHaveBeenCalledWith({ sub: '1' });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });
  });
});