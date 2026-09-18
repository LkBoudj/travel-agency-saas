import { UnauthorizedException } from '@nestjs/common';
import { verify } from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LocalStrategy } from './local.strategy.js';

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

const row = {
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

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new LocalStrategy(prismaMock as unknown as PrismaService);
  });

  it('uses the email field as the username field', () => {
    expect((strategy as unknown as { _usernameField?: string })._usernameField).toBe('email');
  });

  it('returns a safe user (id + profile) without the password hash for valid credentials', async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(row);
    vi.mocked(verify).mockResolvedValue(true);

    const result = await strategy.validate('OWNER@Example.com', 'secret123');

    expect(prismaMock.appUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
    });
    expect(verify).toHaveBeenCalledWith('mock-hashed-password', 'secret123');
    expect(result).toEqual({
      id: '1',
      code: 'USR-ABCDEF123456',
      email: 'owner@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: 'ACTIVE',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an invalid password with Unauthorized', async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(row);
    vi.mocked(verify).mockResolvedValue(false);

    await expect(strategy.validate('owner@example.com', 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an unknown email with Unauthorized', async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null);

    await expect(strategy.validate('ghost@example.com', 'secret123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a suspended account even with correct credentials', async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ ...row, status: 'SUSPENDED' });
    vi.mocked(verify).mockResolvedValue(true);

    const promise = strategy.validate('owner@example.com', 'secret123');

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promise).rejects.toMatchObject({ response: { message: 'Account is suspended' } });
  });
});