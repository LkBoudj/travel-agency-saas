import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AUTH_COOKIE_NAME } from '../auth.constants.js';
import { JwtStrategy } from './jwt.strategy.js';

const prismaMock = {
  appUser: {
    create: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
};

const configMock = {
  getOrThrow: vi.fn(() => 'test-secret-that-is-at-least-thirty-two-characters'),
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

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new JwtStrategy(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );
  });

  it('extracts the JWT from the auth cookie only (never the Authorization header)', () => {
    const extractor = (
      strategy as unknown as {
        _jwtFromRequest: (req: { headers?: Record<string, unknown> }) => string | null;
      }
    )._jwtFromRequest;

    expect(
      extractor({
        headers: {
          cookie: `other=1; ${AUTH_COOKIE_NAME}=TOKEN123; x=2`,
        },
      }),
    ).toBe('TOKEN123');
    expect(extractor({ headers: { authorization: 'Bearer TOKEN123' } })).toBeNull();
  });

  it('resolves the AppUser by the JWT subject and returns the identity (never the password hash)', async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(row);

    const result = await strategy.validate({ sub: '1' });

    expect(prismaMock.appUser.findUnique).toHaveBeenCalledWith({ where: { id: 1n } });
    expect(result).toEqual({
      id: '1',
      code: 'USR-ABCDEF123456',
      email: 'owner@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects a token whose subject does not exist', async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: '999' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token without a subject', async () => {
    await expect(strategy.validate({} as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token with a non-numeric subject', async () => {
    await expect(strategy.validate({ sub: 'not-a-number' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled();
  });
});