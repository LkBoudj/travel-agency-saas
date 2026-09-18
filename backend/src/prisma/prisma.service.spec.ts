import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.js';
import { PrismaModule } from './prisma.module.js';
import { PrismaService } from './prisma.service.js';

describe('PrismaService (Nest ↔ Prisma ↔ Neon)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
      ],
    }).compile();

    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('is injectable and runs a read-only count on a Group 1 model', async () => {
    const appUserCount = await prisma.appUser.count();
    expect(typeof appUserCount).toBe('number');
    expect(appUserCount).toBeGreaterThanOrEqual(0);
  });
});